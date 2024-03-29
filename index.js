import fs from "fs";
import util from "util";
import readline from "readline-sync";
import textToSpeech from "@google-cloud/text-to-speech";
import inquirer from "inquirer";
import xlsx from "node-xlsx";
import * as dotenv from "dotenv";
import chalk from "chalk";

// Create a TextToSpeech client
const client = new textToSpeech.TextToSpeechClient();

// Load voice list
const voiceList = JSON.parse(fs.readFileSync("./voices.json"));
const exportPath = "./export";
const scriptPath = "./script";

// Fisrt run
if (!fs.existsSync(exportPath)) {
    console.log("Generating export folder");
    fs.mkdirSync(exportPath);
}
if (!fs.existsSync(scriptPath)) {
    console.log("Generating script folder");
    fs.mkdirSync(scriptPath);
}

// Function to prompt user for voice assignment
function assignVoice(script) {
    const characters = [
        ...new Set(
            script[0].data
                .slice(1)
                .filter((column) => column[2] !== undefined)
                .map((column) => column[1])
        ),
    ];
    // console.log(characters);
    console.log(
        `> Tìm thấy ${characters.length - 1} nhân vật: ${chalk.yellow(
            characters.join(" - ").slice(0, -2)
        )}`
    ); // Remove undefined character

    const voiceAssignments = {};
    characters.forEach((character) => {
        if (character == undefined) {
            voiceAssignments[character] = "M17"; // set Default voice for undefined character
        } else {
            let voiceName = readline
                .question(`>>> Voice cho ${chalk.yellow(character)}: `)
                .toUpperCase();

            if (Object.keys(voiceList).includes(voiceName)) {
                voiceAssignments[character] = voiceName;
            } else {
                console.log("Voice không tồn tại");
                process.exit(1);
            }
        }
    });

    return voiceAssignments;
}

// Function to convert text to voice using Google Cloud Text-to-Speech API
async function convertTextToVoice(stt, character, text, scriptFolder) {
    const request = {
        input: {
            text: text,
        },
        voice: {
            languageCode: "en-US",
            name: voiceList[character].name,
        },
        audioConfig: {
            pitch: 1,
            speakingRate: 1,
            audioEncoding: "MP3",
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(
            `./export/${scriptFolder}/${stt}.mp3`,
            response.audioContent,
            "binary"
        );
        console.clear();
        console.log(`${stt} - ${text} - Done`);
    } catch (error) {
        // console.error(`Error converting text to voice for ${stt}: ${error}`);
        console.log(error.name);
    }
}

async function textToVoice() {
    // ! REPLACE WITH INQUIRER
    // console.clear();
    // const scriptNumber = readline.question("> Kịch bản: ");
    // const script = xlsx.parse(`./${scriptPath}/${scriptNumber}.xlsx`);

    // const voiceAssignments = assignVoice(script, scriptNumber);

    // if (!fs.existsSync(`./export/${scriptNumber}`)) {
    //     fs.mkdirSync(`./export/${scriptNumber}`);
    // }

    // console.log(`Tạo voice cho ${scriptNumber}...`);

    // for (const column of script[0].data.slice(1)) {
    //     if (column[2] === undefined) continue;
    //     await convertTextToVoice(
    //         column[0],
    //         voiceAssignments[column[1]],
    //         column[2],
    //         scriptNumber
    //     );
    // }
    // // console.clear();
    // console.log(`Hoàn thành tạo voice cho ${scriptNumber}`);

    fs.readdir("./script", async (err, files) => {
        const choices = [];

        files.forEach((file) => {
            if (!file.includes("Zone")) {
                choices.push(file.replace(/\.[^/.]+$/, ""));
            }
        });
        // console.log(choices);
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "theme",
                    message: "Chọn kịch bản: ",
                    choices: choices,
                },
            ])
            .then(async (answers) => {
                const scriptNumber = answers.theme;
                // console.clear();
                const script = xlsx.parse(
                    `./${scriptPath}/${scriptNumber}.xlsx`
                );

                const voiceAssignments = assignVoice(script, scriptNumber);

                if (!fs.existsSync(`./export/${scriptNumber}`)) {
                    fs.mkdirSync(`./export/${scriptNumber}`);
                }

                console.log(`Tạo voice ${chalk.cyan(scriptNumber)}...`);

                for (const column of script[0].data.slice(1)) {
                    if (column[2] === undefined) continue;
                    await convertTextToVoice(
                        column[0],
                        voiceAssignments[column[1]],
                        column[2],
                        scriptNumber
                    );
                }
                // console.clear();
                console.log(
                    `>>> Hoàn thành Voice ${chalk.cyan(scriptNumber)} !`
                );
            });
    });
}

textToVoice().catch((error) => {
    console.error(`${error}`);
    console.log("Không tìm thấy kịch bản");
    process.exit(1);
});
