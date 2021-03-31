
// --------------- Utility -------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sortBySkill (players) {
  return players.sort((a, b) => a.skillNote - b.skillNote);
}

// -------------- Flags --------------------
const FLAGS = {
  insufficientPCs: false,
}

// -------------- References ---------------
const csvUpload = document.getElementById("csv-upload");
const rosterContainer = document.getElementById("roster-body");
const generateButton = document.getElementById("generate");
const uploadRoster = document.getElementById("upload-roster");
const teamsContainer = document.getElementById("teams-body");

let PLAYERS = [];
const SKILL_NOTE = {
  NONE: 0,
  PLUS: 1,
  MINUS: -1,
}

class Player {
  constructor(rowContent, i) {
    this.id = i;
    this.name = rowContent[2] + " " + rowContent[3];
    this.discord = rowContent[4];
    this.gamerTag = rowContent[6];
    this.emails = [rowContent[7], rowContent[10]];
    this.hoursPerWeek = rowContent[8];
    this.partner = rowContent[9];
    this.grade = rowContent[11];
    this.isOnPC = rowContent[5].toLowerCase().includes("pc");
    this.skillNote = parseInt(rowContent[16] || SKILL_NOTE.NONE);
    PLAYERS.push(this);
  }
}

let TEAMS = [];
const TEAM_SIZE = 3; 
class Team {
  constructor(index) {
    this.index = index;
    this.players = [];
  }
  addPlayer(player) {
    player.indexInTeam = this.players.length;
    this.players.push(player);
    return this.players.length;
  }
  get skill () {
    return this.players.reduce((skill, player) => player.skillNote + skill , 0);  
  }
  get hasPC () {
    if (this.players.find(player => player.isOnPC !== undefined)) {
      return true;
    }
  }
}

// -------------- Roster ---------------
const handlePlayerImport = (e) => {
  const FILE = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = reader.result;
    let lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let rowContent = lines[i].split("\t").map((c) => c.trim());
      if (rowContent[4] == "Discord" || rowContent[3] == "") continue;
      new Player(rowContent, i);
    }
    if (PLAYERS.length) {
      generateButton.style.visibility = "visible";
      uploadRoster.style.visibility = "hidden";
    }
    displayRoster();
  };
  reader.readAsText(FILE);
};

const displayRoster = () => {
  PLAYERS.forEach(player => {
    const playerRow = document.createElement("div");
    playerRow.classList.add("roster-player-row");
    playerRow.innerText = `${player.name} - ${player.discord}`;
    rosterContainer.appendChild(playerRow);
  });
};

// -------------- Teams ---------------
const generateTeams = () => {

  TEAMS = [];
  let PCUsers = [];
  let skillUsers = [];
  let filler = [];

  // Get number of teams
  const teamCount = Math.ceil(PLAYERS.length / TEAM_SIZE);

  // Separate players into PC and non-pc
  PLAYERS.forEach(player => {
    if (player.isOnPC) {
      PCUsers.push(player);
    } else if (player.skillNote == 0) {
      filler.push(player);
    } else {
      skillUsers.push(player);
    }
  });

  // Shuffle PC and non-PC users
  PCUsers = shuffleArray(PCUsers);
  skillUsers = shuffleArray(skillUsers);
  filler = shuffleArray(filler);


  // Evenly distribute skills
  (() => {
    const plusPlayers = [];
    const minusPlayers = [];
    skillUsers.forEach((p) => {
      if (p.skillNote == SKILL_NOTE.PLUS) plusPlayers.push(p);
      if (p.skillNote == SKILL_NOTE.MINUS) minusPlayers.push(p);
    })
    const max = plusPlayers.length > minusPlayers.length ? plusPlayers.length : minusPlayers.length;
    const evenlyDistributedSkillUsers = [];
    for (let i =  0; i < max; i++) {
      if (plusPlayers.length) evenlyDistributedSkillUsers.push(plusPlayers.pop());
      if (minusPlayers.length) evenlyDistributedSkillUsers.push(minusPlayers.pop());
    }
    skillUsers = evenlyDistributedSkillUsers;
    
  })();

  // If not enough PC players, set a flag
  FLAGS.insufficientPCs = PCUsers.length > teamCount;

  // Initialize all teams as equal
  for (let i = 0; i < teamCount; i++) {
    TEAMS.push(new Team(i));
  }


  const tryToAssignToNoPC = (player, teams = TEAMS) => {
    const potentialTeams = teams.filter(team => (!team.hasPC) && (team.players.length < TEAM_SIZE));
    if (!potentialTeams.length) return false;
    switch (player.skillNote) {
      case SKILL_NOTE.NONE:
        tryToAssignToOpenTeam(player, potentialTeams)
        return true;
      case SKILL_NOTE.PLUS:
        if (tryToAssignToMinus(player, potentialTeams)){
          return true;
        } else {
          if (tryToAssignToOpenTeam(player, potentialTeams)){
            return true;
          }
        }
        break;
      case SKILL_NOTE.MINUS:
        if (tryToAssignToPlus(player, potentialTeams)){
          return true;
        } else {
          if (tryToAssignToOpenTeam(player, potentialTeams)){
            return true;
          }
        }
        break;
      default:
        return false;
    } 
  }
  const tryToAssignToPlus = (player, teams = TEAMS) => {
    const team = teams.find(team => (team.skill) > 0 && (team.players.length < TEAM_SIZE));
    if (!team) return false;
    team.addPlayer(player);
    return true;
  }
  const tryToAssignToMinus = (player, teams = TEAMS) => {
    const team = teams.find(team => (team.skill < 0) && (team.players.length < TEAM_SIZE));
    if (!team) return false;
    team.addPlayer(player);
    return true;
  }
  const tryToAssignToOpenTeam = (player, teams = TEAMS) => {
    const team = teams.find(team => team.players.length < TEAM_SIZE);
    if (!team) return false;
    team.addPlayer(player);
    return true;
  }

  // First Fill PC Users
  PCUsers.forEach((player) => {
    if (!tryToAssignToNoPC(player)) {
      if (player.skillNote == 0) {
        filler.push(player);
      }
      else {
        skillUsers.push(player);
      }
    }
  });

  skillUsers.forEach(player => {
    if (player.skillNote < 0) {
      if (!tryToAssignToPlus(player)) {
        if (!tryToAssignToOpenTeam(player)) {
          return new Error("No empty slot to fit player.");
        } 
      }
    }
    if (player.skillNote > 0) {
      if (!tryToAssignToMinus(player)) {
        if (!tryToAssignToOpenTeam(player)) {
          return new Error("No empty slot to fit player.");
        } 
      }
    }
  });

  filler.forEach(player => {
    if (!tryToAssignToOpenTeam(player)) {
      return new Error("No empty slot to fit player.");
    } 
  });

  displayTeams();
}


const displayTeams = () => {
  teamsContainer.innerHTML = "";
  TEAMS.forEach((team, i) => {
    const teamNode = document.createElement("div");
    teamNode.classList.add('team');

    const headNode = document.createElement("div");
    headNode.classList.add("team-head");
    teamNode.appendChild(headNode);
    
    const headingNode = document.createElement("span");
    headingNode.innerHTML = `Team ${i + 1} | `;
    headNode.appendChild(headingNode);

    const teamSkillNode = document.createElement("span");
    teamSkillNode.innerHTML = team.skill;
    headNode.appendChild(teamSkillNode);


    const bodyNode = document.createElement("div");
    bodyNode.classList.add('team-body');
    team.players.forEach((p, i) => {
      const playerDiv = document.createElement("div");
      headNode.classList.add("team-player-row");
      playerDiv.innerText = `${i + 1}. ${p.name} - ${p.discord}`;
      if (p.skillNote == SKILL_NOTE.PLUS){
        const plus = document.createElement("span");
        plus.classList.add("fas", "fa-plus", "status-icon");
        playerDiv.appendChild(plus);
      }
      if (p.skillNote == SKILL_NOTE.MINUS){
        const minus = document.createElement("span");
        minus.classList.add("fas", "fa-minus", "status-icon");
        playerDiv.appendChild(minus);
      }
      if (p.isOnPC) {
        const desktop = document.createElement("span");
        desktop.classList.add("fas", "fa-desktop", "status-icon");
        playerDiv.appendChild(desktop);
      }
      bodyNode.appendChild(playerDiv);
    });
    teamNode.appendChild(bodyNode);
    teamsContainer.appendChild(teamNode);
  });
}

// const generateRosterDownload = (cohort, week) => {
//   // Create column names
//   const rows = [["Name", "Leader", "Email", "Platform"]];
//   // Create camper columns
//   cohort.campers.forEach((camper) => {
//     rows.push([camper.name, 0, camper.guardian_email, camper.platform]);
//   });
//   // File header
//   let csvContent = "data:text/csv;charset=utf-8,";
//   // Append rows
//   csvContent += rows.map((rowArray) => rowArray.join(',')).join('\n');
//   // Encode into uri
//   let encodedURI = encodeURI(csvContent);
//   // Create download link element
//   const fileName = `Week ${week + 1}_${cohort.slotDisplay}.csv`
//   let link = document.createElement("a");
//   link.setAttribute("href", encodedURI);
//   link.setAttribute("download", fileName);
//   link.innerText = fileName;
//   return link;
// }

generateButton.addEventListener("click", generateTeams);
generateButton.style.visibility = "hidden";
csvUpload.addEventListener("change", handlePlayerImport);