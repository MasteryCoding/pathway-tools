const csvUpload = document.getElementById("csv-upload");

const WEEK = {
  "CAMP_W1_7AM_AU": 0,
  "CAMP_W1_9AM_AU": 0,
  "CAMP_W1_11AM_AU": 0,
  "CAMP_W1_1PM_AU": 0,
  "CAMP_W2_7AM_AU": 1,
  "CAMP_W2_9AM_AU": 1,
  "CAMP_W2_11AM_AU": 1,
  "CAMP_W2_1PM_AU": 1,
  "CAMP_W12_7AM_AU": 2,
  "CAMP_W12_9AM_AU": 2,
  "CAMP_W12_11AM_AU": 2,
  "CAMP_W12_1PM_AU": 2,
}

const SLOT = {
  "CAMP_W1_7AM_AU": 0,
  "CAMP_W1_9AM_AU": 1,
  "CAMP_W1_11AM_AU": 2,
  "CAMP_W1_1PM_AU": 3,
  "CAMP_W2_7AM_AU": 0,
  "CAMP_W2_9AM_AU": 1,
  "CAMP_W2_11AM_AU": 2,
  "CAMP_W2_1PM_AU": 3,
  "CAMP_W12_7AM_AU": 0,
  "CAMP_W12_9AM_AU": 1,
  "CAMP_W12_11AM_AU": 2,
  "CAMP_W12_1PM_AU": 3,
}

const SLOT_DISPLAY = ["7 am PST", "9 am PST", "11 am PST", "1 pm PST"]

class Week {
  constructor(week) {
    this.weekDisplay = week;
    this.slots = [];
    this.slots[0] = [];
    this.slots[1] = [];
    this.slots[2] = [];
    this.slots[3] = [];
  }
  addPlayer = (player) => {
    const slot = player.slot;
    // Check available cohorts
    const availableCohort = this.checkAvailableCohorts(slot);
    // If none append a new one and add player to the appended cohort.
    if (availableCohort == -1) {
      this.slots[slot].push(new Cohort(slot));
      this.slots[slot][this.slots[slot].length - 1].addPlayer(player);
    } else {
      this.slots[slot][availableCohort].addPlayer(player);
    }
  }
  checkAvailableCohorts = (slot) => {
    let availableCohort = -1;
    for (let i = 0; i < this.slots[slot].length; i++) {
      const cohort = this.slots[slot][i];
      if (cohort.isFull) continue;
      availableCohort = i;
      break;
    }
    return availableCohort;
  }
}
class Camp {
  constructor() {
    // Two weeks
    this.weeks = [];
    this.weeks[0] = new Week("Week 1");
    this.weeks[1] = new Week("Week 2");
  }
  addPlayer = (player) => {
    switch (player.week) {
      case 0:
      case 1:
        this.weeks[player.week].addPlayer(player); 
      break;
      case 2:
        this.weeks[0].addPlayer(player);
        this.weeks[1].addPlayer(player);
      break;
      default: 
        return new Error(`Invalid week entered for player ${player.name}`);
    }
  }
}

const camp = new Camp();
const cohorts = [];
const incompletePlayers = [];
class Cohort {
  constructor(slot) {
    this.slotDisplay = SLOT_DISPLAY[slot]; 
    this.campers = [];
    this.MAX_CAPACITY = 40;
    cohorts.push(this);
  }
  addPlayer = (player) => {
    this.campers.push(player);
  }
  get isFull() {
    return this.campers.length >= this.MAX_CAPACITY;
  }
}

const initializeCohorts = () => {
  camp[0] = new Week();
  camp[1] = new Week();
}

const players = [];
const handlePlayerImport = (e) => {
  initializeCohorts();
  const FILE = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = reader.result;
    let lines = content.split("\r");
    for (let i = 0; i < lines.length; i++) {
      let rowContent = lines[i].split("\t").map((c) => c.trim());
      // Display Columns
      if (i == 0) console.log(rowContent)
      console.log(rowContent.length)
      if (rowContent[0] == "Order ID") continue;
      let player = {};
      player.name = rowContent[3];
      player["week"] = WEEK[rowContent[5]];
      player["slot"] = SLOT[rowContent[5]]; 
      player["guardian_email"] = rowContent[1].split(",")[0];
      player.platform = rowContent[4];
      // player.preferences = [];
      // if (rowContent[52]) player.preferences.push(rowContent[16]);
      // if (rowContent[53]) player.preferences.push(rowContent[17]);
      player["contact_phone"] = rowContent[55];
      if (player.name != "null") {
        players.push(player);
      } else {
        incompletePlayers.push(player);
      }
    }
    players.forEach((player, i) => {
      camp.addPlayer(player);
    });
    console.log(cohorts);
    console.log(incompletePlayers);
    generateHTMLDisplay();
  };
  reader.readAsText(FILE);
};

const generateHTMLDisplay = () => {
  const container = document.getElementById("container");
  camp.weeks.forEach((w) => {
    container.appendChild(weekDisplay(w));
  })
}

const generateRosterDownload = (cohort, week) => {
  // Create column names
  const rows = [["Name", "Leader", "Email", "Platform"]];
  // Create camper columns
  cohort.campers.forEach((camper) => {
    rows.push([camper.name, 0, camper.guardian_email, camper.platform]);
  });
  // File header
  let csvContent = "data:text/csv;charset=utf-8,";
  // Append rows
  csvContent += rows.map((rowArray) => rowArray.join(',')).join('\n');
  // Encode into uri
  let encodedURI = encodeURI(csvContent);
  // Create download link element
  const fileName = `Week ${week + 1}_${cohort.slotDisplay}.csv`
  let link = document.createElement("a");
  link.setAttribute("href", encodedURI);
  link.setAttribute("download", fileName);
  link.innerText = fileName;
  return link;
}

const generateMailingListCopy = (cohort) => {
  let copyString = "" 
  cohort.campers.forEach((c) => copyString += c["guardian_email"] + ", ");
  const copyButton = document.createElement('button');
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(copyString);
  });
  copyButton.innerText = "Copy Mailing List To Clipboard";
  return copyButton;
}


const weekDisplay = (week) => {
  const weekNode = document.createElement('div');
  const heading = document.createElement('h2');
  heading.innerHTML = `${week.weekDisplay}`;
  const slots = [];
  week.slots.forEach((slot, i) => {
    slots.push(slotDisplay(slot, i));
  });
  weekNode.appendChild(heading);
  slots.forEach((s) => {
    weekNode.appendChild(s);
  })
  return weekNode;
}

const slotDisplay = (slot, i) => {
  const slotNode = document.createElement("div");
  const slotTitle = document.createElement("h3");
  slotTitle.innerHTML = SLOT_DISPLAY[i];
  slotNode.appendChild(slotTitle);
  slot.forEach((cohort, i) => {
    slotNode.appendChild(cohortDisplay(cohort, i));
  })
  return slotNode;
}

const cohortDisplay = (cohort, i) => {
  const cohortNode = document.createElement("div");
  
  const cohortTitle = document.createElement("h4");
  cohortTitle.innerHTML = `Cohort ${i + 1} - ${cohort.campers.length} Campers`;
  cohortNode.appendChild(cohortTitle);

  const rosterDownload = generateRosterDownload(cohort, i);
  cohortNode.appendChild(rosterDownload);

  cohortNode.appendChild(generateMailingListCopy(cohort));

  const cohortCampers = document.createElement("div");
  cohortCampers.className = "campers-table";
  cohortCampers.innerHTML = "<div>Name</div><div>Platform</div><div>Email</div>";
  cohort.campers.forEach((camper) => {
    cohortCampers.innerHTML +=  
    `
    <div>${camper.name}</div>
    <div>${camper.platform}</div>
    <div>${camper.guardian_email}</div>
    `;
  });
  cohortNode.appendChild(cohortCampers);
  return cohortNode;
}

csvUpload.addEventListener("change", handlePlayerImport);
