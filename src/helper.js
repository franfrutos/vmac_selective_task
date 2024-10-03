// Script with functions to create trial timeline and stimulus:

/*
    Most of these function are a implementation from opensesame's function to calculate positions:
    https://github.com/open-cogsci/OpenSesame/blob/58dc9ffee3e9e19325e3302d6ae9d12764d5a8d7/libopensesame/python_workspace_api.py

    Functions to draw_display:
*/

const radians = (degrees) => { return degrees * (Math.PI / 180) }
const xy_from_polar = (phi, rho) => {

    // This function assume that the pole is at the coordenates [0, 0]
    if (typeof (rho) === "undefined") return;

    const phi0 = radians(phi);
    const x = rho * Math.cos(phi0);
    const y = rho * Math.sin(phi0);

    return [x, y];

}

const xy_circle = (rho, n = 6, phi0 = 30) => {
    const arr = [];
    let phi = phi0;

    for (let i = 0; i < n; i++) {
        arr.push(xy_from_polar(phi, rho))
        phi += 360 / n
    }

    return arr;
}


const draw_line = (length, width, angle, x, y) => {
    return {
        obj_type: 'line',
        line_length: length,
        line_width: width,
        angle: angle,
        line_color: 'white',
        origin_center: true,
        show_start_time: 1700,
        startX: x,
        startY: y,
    };
}
const draw_cross = (radius, line_w) => {
    return [{
        obj_type: 'line',
        line_length: radius / 2,
        line_width: line_w,
        angle: 0,
        line_color: 'white',
        show_start_time: 1200,
        origin_center: true,
    },
    {
        obj_type: 'line',
        line_length: radius / 2,
        line_width: line_w,
        angle: 90,
        line_color: 'white',
        show_start_time: 1200,
        origin_center: true,
    }];

}

const draw_circle = (radius, line_w, color, x, y) => {
    return {
        obj_type: 'circle',
        radius: radius,
        line_width: line_w,
        line_color: color,
        show_start_time: 1700,
        origin_center: true,
        startX: x,
        startY: y,
    };
}

const draw_diamond = (length, line_w, color, x, y) => {
    return {
        obj_type: 'manual',
        startX: x,
        startY: y - length / 2,
        origin_center: true,
        show_start_time: 1700,
        drawFunc: (stimulus, canvas, context, elapsedTime, sumOfStep, length0 = length, width = line_w, color0 = color) => {
            context.beginPath();

            [x, y] = [stimulus.currentX, stimulus.currentY]
            context.moveTo(x, y);

            // top left edge
            context.lineTo(x - length0 / 2, y + length0 / 2);

            // bottom left edge
            context.lineTo(x, y + length0);

            // bottom right edge
            context.lineTo(x + length0 / 2, y + length0 / 2);

            // closing the path automatically creates
            // the top right edge
            context.closePath();

            context.lineWidth = width;
            context.strokeStyle = color0;
            context.stroke();

        },
    }
};

/* const draw_square = (length, line_w, color, x, y) => {
    return {
        obj_type: 'rect',
        width: length,
        height: length,
        line_width: line_w,
        line_color: color,
        show_start_time: 1700,
        origin_center: true,
        startX: x,
        startY: y,
    };
} */

const create = (shape, radius, width, color, x, y, orientation) => {
    if (shape == "diamond") {
        return [draw_diamond(radius * 2, width, color, x, y), draw_line(radius, width / 2, orientation, x, y)];
    } else {
        return [draw_circle(radius, width, color, x, y), draw_line(radius, width / 2, orientation, x, y)];
    }
}

const set_attributes = (s, colors, targetOri) => {
    // Clarification: as return is used, breaks are not necessary
    const actualOri = (targetOri === "vertical") ? 90 : 0;
    switch (s) {
        case 0:
            return ["circle", color2hex("gray"), shuffle([45, 135, 225, 315])[0]]
        case 1:
            return ["circle", color2hex(colors[0]), shuffle([45, 135, 225, 315])[0]]
        case 2:
            return ["diamond", color2hex("gray"), actualOri]
        default:
            return ["circle", color2hex(colors[1]), shuffle([45, 135, 225, 315])[0]]
    }
}

const draw_display = (radius, width, rho, log, colors, targetOri) => {

    const arr = [];

    arr.push(...draw_cross(radius, width / 2));

    const n_display = 6;
    const phi0 = 45;

    const coordinates = xy_circle(rho, n = n_display);
    let stimuli, x, y;

    for (let i = 0; i < n_display; i++) {
        [x, y] = coordinates[i];
        // Non-singleton distractor shape and color
        attributes = set_attributes(log[i], colors, targetOri);
        stimuli = create(attributes[0], radius, width, attributes[1], x, y, attributes[2]);
        arr.push(...stimuli);
    }
    return arr;
}

// Functions to create trials:
const shuffle = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

const random = (min, max, no) => {
    let rnum = Math.floor(Math.random() * (max - min)) + min;
    if (typeof no !== 'undefined') {
        while (no.indexOf(rnum) >= 0) {
            rnum = Math.floor(Math.random() * (max - min)) + min;
        }
    }
    return rnum;
}

const zeros = (m, n) => {
    return Array.from({
        length: m
    },
        () => new Array(n).fill(0));
}

// Pick colors
const pickColor = (counterbalance) => {
    switch (counterbalance) {
        case 0:
            return ["orange", "blue"];
        case 1:
            return ["blue", "orange"];
        case 2:
            return ["green", "pink"];
        default:
            return ["pink", "green"];
    }
}

// Colors from: https://osf.io/6jhbt
const color2hex = (color) => {
    switch(color) {
        case "gray":
            return "#464646";
        case "pink":
            return "#C26187";
        case "green":
            return "#369141";
        case "orange":
            return "#C15F1E";
        default:
            return "#258DA5";
            
    }
}

// Experiment structure

/* Coding scheme for the relevant shape target/singleton color in the VMAC phase:
    0: distractor, non-singleton
    1: singleton, high
    2: target
    3: singleton, low
*/

/* Array structure
    [
        0, // Top left
        1, // Top
        2, // Top right
        3,
        4,
        5
    ]
*/

// Function to create trials
// Function to create trials
const create_trials = (blocks, norew = "NR", prac = true) => {
    if (blocks == 0) return;
    let distractorAbsent, distractorHigh, distractorLow, conditionLog, trials, blockN;
    const phases = ["Practice", "Rewarded", norew];
    let phaseLog = {};
    for (let phase of phases) {
        if (!prac && phase == "Practice") continue;
        if (blocks == 0 && phase == "Rewarded") continue;
        if (phase == "NR") continue;
        phaseLog[phase] = [];
    }
    for (let j of Object.keys(phaseLog)) {
        if (!prac && j == "Practice") continue;
        if (blocks == 0 && j == "Rewarded") continue;
        conditionLog = [];
        blockN = blocks;
        for (let i = 0; i < blockN; i++) {
            // Change this to include more practice trials
            if (j == "Practice" && i === 0) {
                distractorAbsent = zeros(Math.floor(24), 6); // Singleton Absent
                for (let k = 0; k < distractorAbsent.length; k++) {
                    distractorAbsent[k][random(0, 6)] = 2;
                }
                conditionLog = distractorAbsent;
                break;
            }

            // Trial structure
            distractorHigh = zeros(Math.floor(10), 6); // High-value
            distractorLow = zeros(Math.floor(10), 6); // Low-value
            distractorAbsent = zeros(Math.floor(4), 6); // Singleton Absent

            // Filling distractor absent trials with targets (2s = target):
            for (let k = 0; k < distractorAbsent.length; k++) {
                distractorAbsent[k][random(0, 6)] = 2;
            }

            // Filling distractor High trials (1s = singleton high; 2s = target):
            for (let k = 0; k < distractorHigh.length; k++) {
                distractorHigh[k][random(0, 6)] = 2;
                distractorHigh[k][random(0, 6, [distractorHigh[k].indexOf(2)])] = 1;
            }

            // Filling distractor Low trials (3s = singleton low; 2s = target):
            for (let k = 0; k < distractorLow.length; k++) {
                distractorLow[k][random(0, 6)] = 2;
                distractorLow[k][random(0, 6, [distractorLow[k].indexOf(2)])] = 3;
            }

            // Combining arrays and randomizing order:
            conditionLog = conditionLog.concat(
                shuffle(
                    [].concat(distractorAbsent,
                        distractorHigh,
                        distractorLow)
                ));
        }
        phaseLog[j].push(conditionLog);
    }

    // Final structure object:
    let phaseTrialLog = {};
    for (let phase of Object.keys(phaseLog)) {
        phaseTrialLog[phase] = [].concat(...phaseLog[phase]);
    }

    // Configuring the timeline array
    let trialto = {};
    for (let phase of Object.keys(phaseLog)) {
        trialto[phase] = [];
    }

    // Function to get information about VMAC trials
    const getSing = (j, i) => {
        let conds = (j == "Reversal") ? ["Low", "High"] : ["High", "Low"];
        if (phaseTrialLog[j][i].indexOf(1) > -1) return [phaseTrialLog[j][i].indexOf(1), conds[0]];
        if (phaseTrialLog[j][i].indexOf(3) > -1) return [phaseTrialLog[j][i].indexOf(3), conds[1]];
        return [-1, "Absent"];
    }

    for (let j of Object.keys(trialto)) {
        trials = (j == "Practice") ? 24 : 24 * blocks;

        // List to store indices of trials where the distractor is present
        let dpInd = [];

        for (let i = 0; i < trials; i++) {
            let singInfo = getSing(j, i);
            let singPos = singInfo[0];
            let condition = singInfo[1];

            // Creating the trial object
            let trial = {
                trialLog: phaseTrialLog[j][i],
                targetPos: phaseTrialLog[j][i].indexOf(2),
                singPos: singPos,
                orientation: shuffle(["horizontal", "vertical"])[0],
                condition: condition,
                Phase: j,
                counterbalance: counterbalance,
                colors: pickColor(counterbalance),
                reportTrial: false, // Initially, reportTrial is false
            };

            // If distractor is present, add index to the list
            if (singPos !== -1) {
                dpInd.push(i);
            }

            trialto[j].push(trial);
        }

        // Now, mark report trials according to specifications
        if (j !== "Practice") {
            markReportTrials(trialto[j], dpInd);
        }
    }

    // Console.log to verify report trials
    for (let phase of Object.keys(trialto)) {
        console.log(`Report trials in phase "${phase}":`);
        let reportTrialIndices = [];
        for (let i = 0; i < trialto[phase].length; i++) {
            if (trialto[phase][i].reportTrial) {
                reportTrialIndices.push(i);
            }
        }
        console.log(reportTrialIndices);
    }

    return trialto;
}

// Function to mark report trials
const markReportTrials = (trialArray, dpInd) => {
    const totalTrials = trialArray.length;
    const numBlocks = Math.floor(totalTrials / 48);
    const trialsPerBlock = 48;

    for (let b = 0; b < numBlocks; b++) {
        const bStart = b * trialsPerBlock;
        const bEnd = bStart + trialsPerBlock;

        // For the first 24 trials, ensure at least one report trial
        processBlock(trialArray, dpInd, bStart, bStart + 24, false, true);

        // For the last 24 trials, ensure a report trial in the last 12 trials
        processBlock(trialArray, dpInd, bStart + 24, bEnd, true);
    }

    // Process remaining trials if less than 48
    const remainingTrials = totalTrials % 48;
    if (remainingTrials > 0) {
        const remainingStart = numBlocks * trialsPerBlock;
        processBlock(trialArray, dpInd, remainingStart, totalTrials, false, true);
    }
}

const processBlock = (trialArray, dpInd, bStart, bEnd, mustHaveLast12, mustHaveEither12 = false) => {
    // Divide the block into two sub-blocks of 12 trials
    const first12Start = bStart;
    const first12End = Math.min(bStart + 12, bEnd);
    const last12Start = first12End;
    const last12End = bEnd;

    let includeFirst12 = false;
    let includeLast12 = false;

    if (mustHaveEither12) {
        // Randomly decide which sub-block will have the mandatory report trial
        const subBlockToForce = random(0, 2); // 0 or 1
        if (subBlockToForce === 0) {
            includeFirst12 = true;
        } else {
            includeLast12 = true;
        }
    }

    // For sub-blocks where we don't force inclusion, decide randomly
    if (!includeFirst12) {
        includeFirst12 = random(0, 2) === 0; // 50% chance
    }

    if (!includeLast12 && !mustHaveLast12) {
        includeLast12 = random(0, 2) === 0; // 50% chance
    } else if (mustHaveLast12) {
        includeLast12 = true; // Force inclusion if required
    }

    // Mark report trials in sub-blocks
    markReportInSubBlock(trialArray, dpInd, first12Start, first12End, includeFirst12);
    markReportInSubBlock(trialArray, dpInd, last12Start, last12End, includeLast12);
}

const markReportInSubBlock = (trialArray, dpInd, start, end, mustHaveReport) => {
    // Get indices of trials with distractor present in the sub-block
    const subBlockDPInd = dpInd.filter(index => index >= start && index < end);

    // If we must include a report trial
    if (mustHaveReport) {
        // Select a random trial among those with distractor present
        let shuffledIndices = shuffle(subBlockDPInd);
        let tIndex = shuffledIndices[0];
        trialArray[tIndex].reportTrial = true;
    }
}

// Function to compute the amount of points earned in each trial
const compute_points = (rt, condition, phase) => {
    if (rt === null || phase == "Practice" || phase == "Omission") return 0;
    if (condition == "High" && phase == "Devaluation") return 0;
    const bonus = (condition == "High" && phase != "Extinction") ? 1 : .1;
    const points = Math.floor((1000 - rt) * bonus);
    if (points < 0) return 0;
    return points;
}

// Function to translate colors to spanish
const colors_t = (color) => {
    if (color == "orange") return `<span style = 'color:${color2hex(color)}'>naranja</span>`
    if (color == "blue") return `<span style = 'color:${color2hex(color)}'>azul</span>`
    if (color == "green") return `<span style = 'color:${color2hex(color)}'>verde</span>`
    return `<span style = 'color:${color2hex(color)}'>rosa</span>`
}

// Function that formate numbers
// Modified from: https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
const formatting = (x) => {
    x = x.split(".");
    inte = x[0].replace(",", "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    decimal = (x[1] !== undefined) ? `.${x[1]}` : "";
    return inte + decimal;
}

const capitalize = (string) => {
    let lower = string.toLowerCase();
    return lower[0].toUpperCase() + lower.slice(1);
}

// Function to find participant points cut-off:
const find_ranking = (arr, points, r = false) => {
    // Transform array to bool and then sum up every element
    let rank = arr.map((e) => e < points).reduce((acc, cur) => acc + cur) - 1;
    return (rank > 5 && !r) ? rank - 1 : rank;
}

const get_medal = (rank) => {
    return (rank >= 0) ? `medal${rank}.png` : "";
}

// How many points until the next medal?
const next_points = (arr, ranking, points) => {
    return arr[ranking] - points;
}

const report_performance = (rank) => {
    const performance = (rank >= 0) ? [10, 30, 40, 60, 70, 90, 99][rank] : 10;
    return `<p>Esto significa que has acumulado ${(rank >= 0) ? "más" : "menos"} puntos que el ${performance}% de las personas que han hecho esta tarea.`
}

// Function to get counterbalance in Jatos at the start of the experiment
const getCond = (N) => {
    const counter_Number = N; //Setting number of participants in each condition
    const randomCond = random(0, jatos.batchSession.get("pending").length);
    const condition = jatos.batchSession.find("/pending/"+randomCond);
    if (typeof condition != 'undefined') {
        const counterS = Number(jatos.batchSession.find("/counterS/"+condition)) + 1;
        jatos.batchSession.replace("/counterS/"+condition, counterS) //don't use  ";"
            .then(() => {console.log("Batch Session was successfully updated")
                                console.log("condition: " + condition)
            })
            .then(() => {if (counterS >= counter_Number) jatos.batchSession.move("/pending/" + randomCond, "/finished/0")
                .then(() => console.log(condition + "has been removed from the pending list"))
                .catch(() => {console.log("Problem with move")
                                     setTimeout(() => getCondition(), 1)});
            })
            .catch(() => {console.log("Batch Session synchronization failed")
                                 SetTimeout(() => getCondition(), 1)
                                 getCondition()});
        return condition;
    }
    return false;
}

const finishCond = () => {
    const counterF = Number(jatos.batchSession.find("/counterF/"+condition)) + 1;
    jatos.batchSession.replace("/counterF/"+condition, counterF) //Don't use' ";"
        .then(() => console.log("Batch Session was successfully updated"))
        // .then(() => {if (persistent.counterF == 2) jatos.batchSession.move("/pending/" + persistent.randomCond, "/finished/0")
        //     .then(() => console.log("Done"))
        //     .catch(() => {console.log("Problem with move")
        //                          setTimeout(() => finishCond(), 1)});
        // })
        .catch(() => {console.log("Batch Session synchronization failed")
                             finshCond()});
}

// Function to end study or go to the next component
const studyEnd = (href = null) => {
    if (window.jatos) {
        console.log(end);
        if (end == false) finishCond();
        const results = jsPsych.data.get().filter([{ trial_type: "psychophysics" }, { trial_type: "survey-html-form" }]).json();
        jatos.submitResultData(results)
            .then((end)?jatos.endStudyAjax:jatos.startNextComponent)
            .then(() => {if (href != null) window.location.href = href })
            .catch(() => console.log("Something went wrong"));    
    }
}

// Generate a random ID for participants
const randomID = (num = 6, lett = 2) => {
    let ID = '';
    let tmp;
    const letter = Array.from(Array(26)).map((e, i) => i + 65).map((x) => String.fromCharCode(x)); // Alphabet letters
    for (let  i = 0; i < num; i++) {
      tmp = random(0, 9).toString();
      ID += tmp;
    }
    for (let i = 0; i < lett; i++) {
        tmp = letter[random(0, letter.length - 1)];
        ID += tmp
    }
    return ID;
  };

  const assign_condition = (url_cond) => {
    if (jatos_run) {
        condition = getCond(90);
    } else {
        condition = (url_cond != undefined) ? capitalize(urlvar.condition) : "A";
    }

    if (jatos_run && !condition) {
        jsPsych.run([limit]);
    }

    jsPsych.data.addProperties({
        ID: ID,
        group: condition[0],
        amuont_checks: condition[1],
    });
}

const check_limit = () => {
    if (jatos_run) {
        if (jatos.batchSession.get("pending").length == 0) {
            jsPsych.run([limit]);
        }
    }
}

// Functions to use in text.js
const wrapper = (text, width = false, amount = 100, bottom = false) => {
    return `<div class = "inst" style = \"${(width) ? `min-width:${amount}%;` : ""}
    ${(bottom) ? "margin-bottom:60px;" : ""}\"> ${text}</div>`
}

let ball_animation_frame_id = null;
let state = false;

const animBall = () => {
    const ball = document.querySelector("#virtual-chinrest-circle");
    const dx = -.5; // same as ball_speed parameter
    const x = parseFloat(ball.style.left); // allow changes below one px
    ball.style.left = `${x + dx}px`;
    ball_animation_frame_id = requestAnimationFrame(animBall);
}

const setBall = () => {
    const ball = document.querySelector("#virtual-chinrest-circle");
    if (ball != null) {
        const square = document.querySelector("#virtual-chinrest-square");
        const rectX = document.querySelector(".inst").getBoundingClientRect().width - 30;
        const ballX = rectX * 0.85; // define where the ball is
        ball.style.left = `${ballX}px`;
        square.style.left = `${rectX}px`;
    }
}

const cal_c = (e) => {
    if (e.key == " " ||
        e.code == "Space" ||
        e.keyCode == 32) {
        if (!state) {
            state = true;
            animBall();
        } else {
            state = false;
            cancelAnimationFrame(ball_animation_frame_id);
            setBall();
        }
    }
}

const aspect_ratio = 85.6 / 53;
const ResizePhase = () => {
    const display_element = document.querySelector(".inst");
    // Event listeners for mouse-based resize
    let dragging = false;
    let origin_x, origin_y;
    let cx, cy, curr_width, curr_height, to_height, to_width;
    const scale_div = display_element.querySelector("#item");
    if (scale_div != null) {
        function mouseupevent() {
            dragging = false;
        }
        display_element.addEventListener("mouseup", mouseupevent);
        function mousedownevent(e) {
            e.preventDefault();
            dragging = true;
            origin_x = e.pageX;
            origin_y = e.pageY;
            cx = parseInt(scale_div.style.width);
            cy = parseInt(scale_div.style.height);
        }
        display_element
            .querySelector("#jspsych-resize-handle")
            .addEventListener("mousedown", mousedownevent);
        function resizeevent(e) {
            if (dragging) {
                curr_height = scale_div.style.height;
                curr_width = scale_div.style.width;
                let dx = e.pageX - origin_x;
                let dy = e.pageY - origin_y;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    to_width = Math.round(Math.max(20, cx + dx * 2));
                    to_height = Math.round(Math.max(20, cx + dx * 2) / aspect_ratio);
                }
                else {
                    to_height = Math.round(Math.max(20, cy + dy * 2));
                    to_width = Math.round(aspect_ratio * Math.max(20, cy + dy * 2));
                }
                // This limits the maximun size
                if (to_height >= 300 || to_height <= 100) {
                    scale_div.style.height = curr_height + "px";
                    scale_div.style.width = curr_width + "px";
                } else {
                    scale_div.style.height = to_height + "px";
                    scale_div.style.width = to_width + "px";
                }
            }
        }
        display_element.addEventListener("mousemove", resizeevent);
    }
}

const circle_c = (ctx, x, y, r, color) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = color2hex(color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.lineWidth = 7;
    ctx.stroke();
}

const diamond_c = (ctx, x, y, r, color) => {
    ctx.lineWidth = 3;
    ctx.beginPath();

    ctx.moveTo(x, y - r);

    // top left edge
    ctx.lineTo(x - r, y);

    // bottom left edge
    ctx.lineTo(x, y + r);

    // bottom right edge
    ctx.lineTo(x + r, y);

    // closing the path automatically creates
    // the top right edge
    ctx.closePath();
    //context.linewidth = line_w;
    ctx.strokeStyle = color2hex(color);
    ctx.lineWidth = 7;
    ctx.stroke();
}

const line = (ctx, x, y, r, color, mode, i) => {
    ctx.lineWidth = 3;
    let fromx, fromy, tox, toy, pos;
    if (mode == "r") {
        pos = (i % 2 == 0)? 0: 1;
        const theta = radians([45, 135][pos]);
        [fromx, fromy] = [(-r / 2 * Math.cos(theta)) + x, (-r / 2 * Math.sin(theta)) + y];
        [tox, toy] = [(r / 2 * Math.cos(theta)) + x, (r / 2 * Math.sin(theta)) + y];
    } else if (mode == "h") {
        [fromx, fromy] = [x - r / 2, y];
        [tox, toy] = [x + r / 2, y]
    } else {
        [fromx, fromy] = [x, y - r / 2];
        [tox, toy] = [x, y + r / 2]
    }

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.stroke();
}


const cross_c = (ctx, x, y, r) => {
    ctx.lineWidth = 3;
    let fromx, fromy, tox, toy;
    for (let i = 0; i < 2; i++) {
        if (i) {
            [fromx, fromy] = [x - r / 4, y];
            [tox, toy] = [x + r / 4, y]
        } else {
            [fromx, fromy] = [x, y - r / 4];
            [tox, toy] = [x, y + r / 4]
        }
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3.5;
        ctx.stroke();
    }
}

const exp_c = () => {
    const c = document.getElementById("myCanvas1");
    const urlvar = (jatos_run) ? jatos.urlQueryParameters : jsPsych.data.urlVariables();
    const blocks = (Number(urlvar.blocks) == 0) ? 0 : (!isNaN(Number(urlvar.blocks))) ? Number(urlvar.blocks) : 12;
    const [colorHigh, colorLow] = (blocks != 0) ? trialObj["Rewarded"][1].colors : ["orange", "blue"];
    if (c!= null && state) state = false;
    else state = true;
    if (c) {
        if (state) state = false;
        else state = true;
        if (!state) {
            let ctx = c.getContext("2d");
            const coordinates = xy_circle(100);
            cross_c(ctx, 200, 150, 30);
            let x, y;
            for (let i = 0; i < 6; i++) {
                [x, y] = coordinates[i];
                [x, y] = [x + 200, y + 150];
                if (i == 2) {
                    diamond_c(ctx, x, y, 30, "gray");
                    line(ctx, x, y, 30, "#fff", "h");
                } else if (i == 5) {
                    circle_c(ctx, x, y, 30, colorHigh);
                    line(ctx, x, y, 30, "#fff", "r", i);
                } else {
                    circle_c(ctx, x, y, 30, "gray");
                    line(ctx, x, y, 30, "#fff", "r", i);
                }
            }
            const c2 = document.getElementById("myCanvas2");
            if (c2) {
                let ctx = c2.getContext("2d");
                cross_c(ctx, 200, 150, 30);
                const coordinates = xy_circle(100);
                let x, y;
                for (let i = 0; i < 6; i++) {
                    [x, y] = coordinates[i];
                    [x, y] = [x + 200, y + 150];
                    if (i == 2) {
                        diamond_c(ctx, x, y, 30, "gray");
                        line(ctx, x, y, 30, "#fff", "v");
                    } else if (i == 5) {
                        circle_c(ctx, x, y, 30, colorLow);
                        line(ctx, x, y, 30, "#fff", "r", i);
                    } else {
                        circle_c(ctx, x, y, 30, "gray");
                        line(ctx, x, y, 30, "#fff", "r", i);
                    }
                }
            }
        }
    }
    const [h, v] = [document.getElementById("h"), document.getElementById("v")];
    if (h != null && state) state = true;
    else state = false;
    //if (h == null) counter = 0;
    if (h) {
        if (state) state = false;
        else state = true;
        if (!state) {
            let ctxh = h.getContext("2d");
            let ctxv = v.getContext("2d");
            diamond_c(ctxh, 150, 75, 60, "gray");
            line(ctxh, 150, 75, 60, "#fff", "h");
            diamond_c(ctxv, 150, 75, 60, "gray");
            line(ctxv, 150, 75, 60, "#fff", "v");
        }
    }
}

const slider_c = () => {
    const c1 = document.getElementById("myCanvas1");
    const c2 = document.getElementById("myCanvas2");

    const urlvar = (jatos_run) ? jatos.urlQueryParameters : jsPsych.data.urlVariables();
    const blocks = (Number(urlvar.blocks) == 0) ? 0 : (!isNaN(Number(urlvar.blocks))) ? Number(urlvar.blocks) : 12;
    const [colorHigh, colorLow] = (blocks != 0) ? trialObj["Rewarded"][1].colors : ["orange", "blue"];

    let [ctx1, ctx2] = [c1.getContext("2d"), c2.getContext("2d")];


    circle_c(ctx1, 75, 75, 60, colorHigh);
    circle_c(ctx2, 75, 75, 60, colorLow);

}

const slider_move = () => {
    let [h_p, l_p] = [document.getElementById("high-placeholder"), document.getElementById("low-placeholder")];
    let slider = document.getElementsByClassName("jspsych-slider");
    [h_p.textContent, l_p.textContent] = (random_high_pos == 1)?
        [100 - slider[0].value, slider[0].value]:
        [slider[0].value, 100 - slider[0].value];

}

const prac_c = () => {
    const c = document.getElementById("myCanvas");
    if (c) {
        if (state) state = false
        else state = true;
        if (state) {
            let ctx = c.getContext("2d");
            cross_c(ctx, 200, 150, 30);
            const coordinates = xy_circle(100);
            let x, y;
            for (let i = 0; i < 6; i++) {
                [x, y] = coordinates[i];
                [x, y] = [x + 200, y + 150];
                if (i == 2) {
                    diamond_c(ctx, x, y, 30, "gray")
                    line(ctx, x, y, 30, "#fff", "h")
                }
                else {
                    circle_c(ctx, x, y, 30, "gray")
                    line(ctx, x, y, 30, "#fff", "r", i)
                }
            }
        }
    }
    const [h, v] = [document.getElementById("h"), document.getElementById("v")];
    //if (h == null) counter = 0;
    if (h) {
        if (state) state = false;
        else state = true;
        if (!state) {
            let ctxh = h.getContext("2d");
            let ctxv = v.getContext("2d");
            diamond_c(ctxh, 150, 75, 60, "gray");
            line(ctxh, 150, 75, 60, "#fff", "h");
            diamond_c(ctxv, 150, 75, 60, "gray");
            line(ctxv, 150, 75, 60, "#fff", "v");
        }
    }
    if (h == null) state = true;
    else state = false;
}