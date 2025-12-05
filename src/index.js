import cheerio from "cheerio";

import "./styles.css";
import fs from 'fs';
import { parse } from "path";



const html = fs.readFileSync("./src/page.html", "utf-8");

// const raw = fs.readFileSync("./src/raw.json", "utf-8");
// console.log(JSON.parse(raw))
// const data = fs.readFileSync("./src/test.json", "utf-8");

// const parsed = fs.readFileSync("./src/parsed.json", "utf-8");


// function checkDuplicates(items) {
//     const combinedData = [];
//     console.log(items)
//     if(items) {
//         items.forEach((item, index) => {
//             const { league_name, sport, site_id, games, teams, game_type } = item
//             let isUnique = true;
//             const homeTeam = teams[Object.keys(teams)[0]][0];
//             const awayTeam = teams[Object.keys(teams)[0]][1];
//             if(league_name === "J2 League" && site_id === 823 && item.home_team === "주빌로 이와타") {
//               console.log(index, item)
//             }
//             combinedData.forEach(data => {
//                 if (
//                     data.league_name === league_name &&
//                     data.sport === sport &&
//                     data.game_type === game_type &&
//                     // data.date === date &&
//                     // site_id !== data.site_id &&
//                     // (data.home_team.trim() === home_team.trim() || data.away_team.trim() === away_team.trim())
//                     homeTeam === data.teams[Object.keys(data.teams)[0]][0] &&
//                     awayTeam === data.teams[Object.keys(data.teams)[0]][1]
//                 ) {
//                     isUnique = false
//                     games.forEach(game => {
//                         if (site_id !== data.site_id) {
//                             data.games.push(game)
//                             data.games.sort((a, b) => b.result?.[0]?.game_result?.prize - a.result?.[0]?.game_result?.prize);
//                         }
//                     })
//                 } 
//             })

//             if (isUnique) {
//                 combinedData.push(item)
//             }
//         })
//     }
//     return combinedData
// }

// console.log(checkDuplicates(JSON.parse(data)))

const formatDate = (e, a) => {
    function padZero(e) {
      return (1 === (e += "").length ? "0" : "") + e;
    }
    a = new Date(Date.parse(e) + 6e4 * a);
    return "Invalid Date" !== a
      ? `${padZero(a.getMonth() + 1)}/${padZero(a.getDate())} ${padZero(a.getHours())}:${padZero(a.getMinutes())}`
      : e;
  }


function getTeamNameTranslations(home_team_name, away_team_name, teamData) {
    return {
        home: home_team_name,
        away: away_team_name
    }
}

  function formatBaseballDate(inputDate) {
        // let [dateStr, time] = inputDate.split(" ");
        // let [hours, minutes] = time.split(":");

        const dateObj = inputDate.split(" ");
        const dateStr = dateObj[0]
        const time = dateObj[1]

        const timeObj = time.split(":");
        let hours = timeObj[0]
        let minutes = timeObj[1]

        // Convert string parts to numbers
        hours = parseInt(hours);
        // Check if the minutes part is 9
        if (minutes.endsWith('9')) {
            // Add 1 minute
            minutes = parseInt(minutes);
            minutes++;
            if (minutes === 60) {
                // If minutes overflow, reset minutes to 0 and increment hours
                minutes = 0;
                hours++;
                if (hours === 24) {
                    // If hours overflow, reset hours to 0
                    hours = 0;
                }
            }
        } else if (minutes.endsWith('8')) {
            // Add 1 minute
            minutes = parseInt(minutes);
            minutes += 2;
            if (minutes === 60) {
                // If minutes overflow, reset minutes to 0 and increment hours
                minutes = 0;
                hours++;
                if (hours === 24) {
                    // If hours overflow, reset hours to 0
                    hours = 0;
                }
            }
        }  else if (minutes.endsWith('7')) {
            // Add 1 minute
            minutes = parseInt(minutes);
            minutes += 3;
            if (minutes === 60) {
                // If minutes overflow, reset minutes to 0 and increment hours
                minutes = 0;
                hours++;
                if (hours === 24) {
                    // If hours overflow, reset hours to 0
                    hours = 0;
                }
            }
        }

        return `${dateStr} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

const teamData = {}
const siteID = 1
const siteName = "sandbox"

// const removeKoreantText = /[^0-9/: ]/g
// replace(removeKoreantText, ""); // Remove unwanted text, keep date/time
// div.JBS_DATA
// roma-italy.com
function extract(html) {
  const $doc = cheerio.load(html);
  let currentLeague = "";

  return $doc("div.league-label, div.team-div")
    .map((_, el) => {
      const row = $doc(el);
      const data = {};

      // If it's a league label, update the league name and skip returning data
      if (row.hasClass("league-label")) {
        currentLeague = row.text().trim();
        return;
      }

      data.league_name = currentLeague;
      data.date = row.children().eq(0).text().trim();

      // Home Team
      data.home_team = row.children().eq(1).find("button > div").text().trim();
      data.home = row.children().eq(1).find("button > span > span").last().text().trim();

      // Draw value
      data.draw = row.children().eq(2).text().trim();

      // Away Team
      data.away_team = row.children().eq(3).find("button > div").text().trim();
      data.away = row
        .children()
        .eq(3)
        .find("button > span")
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

      // Type
      data.type_name = row.children().eq(4).text().trim();

      // Mapping type logic
      const moneylineTypes = ["승무패", "승패", "승패(연장포함)"];
      const spreadTypes = ["핸디캡", "핸디캡(연장포함)"];
      const totalTypes = ["오버언더", "오버언더(연장포함)"];

      if (moneylineTypes.includes(data.type_name)) {
        data.type = "moneyline";
        data.point = data.draw === "VS" ? "vs" : parseFloat(data.draw);
      } else if (spreadTypes.includes(data.type_name)) {
        data.type = "handicap";
        data.point = data.draw === "VS" ? 0 : parseFloat(data.draw);
      } else if (totalTypes.includes(data.type_name)) {
        data.type = "over_under";
        data.point = parseFloat(data.draw);
      }

      if (data.home !== "0.00" && data.away !== "0.00") {
        return data;
      }
    })
    .get()
    //     .reduce((rows, item) => {
    //   const { home_team, away_team } = item;
    //   const home_team_name = home_team
    //     .replace(/\([^)]+\)|\[[^\]]+\]/g, "")
    //     .trim();
    //   const away_team_name = away_team
    //     .replace(/\([^)]+\)|\[[^\]]+\]/g, "")
    //     .trim();

    //   if (
    //     rows.find(
    //       (row) =>
    //         row.league_name == item.league_name &&
    //         row.date == item.date &&
    //         row.home_team == home_team_name &&
    //         row.away_team == away_team_name,
    //     )
    //   ) {
    //     return rows.map((row) => {
    //       if (
    //         item.type !== "moneyline" &&
    //         row.league_name == item.league_name &&
    //         row.date == item.date &&
    //         row.home_team == home_team_name &&
    //         row.away_team == away_team_name
    //       ) {
    //         row.odds.push({
    //           type: item.type,
    //           home: parseFloat(item.home),
    //           point: item.point,
    //           away: parseFloat(item.away),
    //         });
    //       }
    //       return row;
    //     });
    //   } else {
    //     const translation = getTeamNameTranslations(
    //       home_team_name,
    //       away_team_name,
    //       teamData,
    //     );
    //     return [
    //       ...rows,
    //       {
    //         league_name: item.league_name,
    //         date: item.date,
    //         home_team: home_team_name,
    //         english_home_team: translation?.home,
    //         away_team: away_team_name,
    //         english_away_team: translation?.away,
    //         site_id: siteID,
    //         sport: item.sport,
    //         site_name: siteName,
    //         odds: [
    //           {
    //             type: item.type,
    //             home: parseFloat(item.home),
    //             point: item.point,
    //             away: parseFloat(item.away),
    //           },
    //         ],
    //       },
    //     ];
    //   }
    // }, []);
}

// change the html value to the site you want to scrape 
console.log(extract(html))