// Run in JATOS server?
const jatos_run = window.jatos !== undefined || false;
if (jatos_run) console.log("Run in Jatos server.")
else console.log("Run in local machine.")

// Initialize jsPsych
const jsPsych = initJsPsych({
    on_finish: () => {
        if (window.jatos) {
            finishCond();
            const results = jsPsych.data.get().filterCustom(filter_custom).json();
            jatos.submitResultData(results)
            jatos.submitResultData(results)
                .then(jatos.endStudyAjax)
                .then(() => { window.location.href = `https://ugr-cimcyc.sona-systems.com/webstudy_credit.aspx?experiment_id=162&credit_token=1e2255aae6db4651b488c92afb98e7c7&survey_code=${ID}` })
                .catch(() => console.log("Something went wrong"));    
        }
    }
});

const seed = jsPsych.randomization.setSeed(Math.floor(Math.random()*9999));
jsPsych.data.addProperties({
    rng_seed: seed
});

const lab = false;

console.log(`Random seed: ${seed}`)

const counterbalance = random(0, 4);

console.log(`Counterbalance: ${counterbalance}`)

var trialObj, random_high_pos = random(1, 3), task, not_consent = false, ID, viewDist;

// Preload all images:
const preload = {
    type: jsPsychPreload,
    images: [
        'src/img/dni.jpg',
        "src/img/orange_loc.png", 
        "src/img/blue_loc.png",
        "src/img/pink_loc.png",
        "src/img/green_loc.png",
        "src/img/orange_col.png", 
        "src/img/blue_col.png",
        "src/img/pink_col.png",
        "src/img/green_col.png",
        'src/img/medals/MedalDisplay.jpg',
        'src/img/medals/medal0.png',
        'src/img/medals/medal1.png',
        'src/img/medals/medal2.png',
        'src/img/medals/medal3.png',
        'src/img/medals/medal4.png',
        'src/img/medals/medal5.png',
    ],
    max_load_time: 60000,
    show_detailed_errors: true
}