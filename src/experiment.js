// Experimental trials code
const run_experiment = () => {
    const timeline = [];

    // Setting parameters
    const urlvar = (jatos_run && jatos.urlQueryParameters != undefined) ? jatos.urlQueryParameters : 
    (jsPsych.data.urlVariables() != undefined)? jsPsych.data.urlVariables():
     {}; // If no urlvar
    const norew = (urlvar.phase != undefined && ["Reversal", "Devaluation", "Omission"].includes(capitalize(urlvar.phase))) ?
        capitalize(urlvar.phase) :
        "NR";
    const blocks = (Number(urlvar.blocks) == 0) ? 0 : (!isNaN(Number(urlvar.blocks))) ? Number(urlvar.blocks) : 12;
    const prac = (urlvar.blocks == 0 && urlvar.blocks != undefined) ? false : (urlvar.prac == "true" || urlvar.prac == undefined) && blocks != 0;
    const gam = (urlvar.gamify == "true")? true: true;
    if (urlvar.phase == undefined) console.log("No phase parameter used. Default is NR.")
    else if (!["Reversal", "Devaluation", "Omission"].includes(capitalize(urlvar.phase))) console.log(`WARNING: an invalid phase parameter was used: ${urlvar.phase}. Phase has been set to NR.`);

    console.log(`Experiment Parameters
       Phase: ${norew}. Blocks: ${blocks}. Practice: ${prac}. Condition: ${urlvar.condition}. norew: ${norew}. gamify: ${gam}.`);
    
    trialObj = create_trials(blocks, norew, prac);
    const [colorHigh, colorLow] = (blocks != 0) ? trialObj["Rewarded"][1].colors : [color2hex("orange"), color2hex("blue")];
    if (blocks != 0) console.log(`Color high is ${colorHigh}. Color low is ${colorLow}.`)
    ID = (urlvar.ID != undefined)? urlvar.ID: randomID();
    if (jatos_run) jatos.studySessionData.subjID = ID; // Saving ID for the next component

    console.log("ID: " + ID);

    // Check if there is conditions in the pending list
    const check_cond = {
        type: jsPsychCallFunction,
        func: () => check_limit(),
    }

    // Assign condition after VMAC practice is finished
    const cond_func = {
        type: jsPsychCallFunction,
        func: () => assign_condition(urlvar.condition),
    }

    // Experimental trial

    // Points necessary for earning medals. Due to the dual task, amout of points necessary are increased (by a 20% at each level)
    const points_cut_off = [15500, 27200, 31900, 37300, 40000, 49300, 57000].map((p) => {
        return (p != 15500) ? p * 1.2 : p;
    })


    let trialNum = 0, total_points = 0, BlockNum = 0, fail = true, cont = false, phase_out = "VMAC", report_trial = false, sumCorr = 0, pracCorr = 0, correctReport = 0, incorrectReport = 0, confidence_counter = 1, currentPhase = "Practice", meanAccPrac = 0, meanReportAccPrac = 0, out1 = false, out2 = false;

    const trial = {
        type: jsPsychPsychophysics,
        stimuli: () => {
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg; // If experiment is run in lab, custom px2deg
            const log = jsPsych.timelineVariable("trialLog");
            // Stimulus size is determined to an scaling factor that transform pixels to degrees of visual angle
            return draw_display(1.15 * sF, 0.2 * sF, 5.05 * sF, log,
                jsPsych.timelineVariable("colors"),
                jsPsych.timelineVariable("orientation"),
                false);
        },
        choices: () => {
            return ["b", "j"];
        },
        background_color: '#000000',
        canvas_width: () => { // Canvas size depends on stimulus size by default. This prevents canvas bieing too small.
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg;
            return sF * 15; 
        },
        canvas_height: () => {
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg;
            return sF * 15;
        },
        data: () => {
            if (jsPsych.timelineVariable("Phase") != "Reversal") {
                color = (jsPsych.timelineVariable("condition") == "High") ? colorHigh : (jsPsych.timelineVariable("condition") == "Low")? colorLow: "none";
            } else {
                color = (jsPsych.timelineVariable("condition") == "Low") ? colorHigh : (jsPsych.timelineVariable("condition") == "High")? colorLow: "none";
            }
            currentPhase = jsPsych.timelineVariable("Phase");
            return {
                tPos: jsPsych.timelineVariable("targetPos"),
                sPos: jsPsych.timelineVariable("singPos"),
                Phase: jsPsych.timelineVariable("Phase"),
                condition: jsPsych.timelineVariable("condition"),
                Block_num: (trialNum % 24 == 0 && jsPsych.timelineVariable("Phase").includes("Rewarded"))  ? ++BlockNum : BlockNum,
                trial_num: ++trialNum,
                counterbalance: counterbalance,
                color: color,
            }
        },
        on_finish: (data) => {
            data.correct_response = (jsPsych.timelineVariable("orientation") == "vertical") ? "j" : "b";
            data.correct = (jsPsych.pluginAPI.compareKeys(data.response, data.correct_response)) ? 1 : 0;
            data.points = (data.correct) ? compute_points(data.rt, data.condition, data.Phase) : -compute_points(data.rt, data.condition, data.Phase);
            total_points = (total_points + data.points <= 0) ? 0 : total_points + data.points;
            data.total_points = total_points;
            if(data.correct == 1) sumCorr++;
            pracCorr = sumCorr / trialNum;
            // Report trial?
            report_trial = jsPsych.timelineVariable("reportTrial");
            if (data.Phase == "Practice2" || data.Phase == "Practice3") {
                meanAccPrac = jsPsych.data.get()
                    .filterCustom(trial => trial.Phase === "Practice2" || trial.Phase === "Practice3") // Filter by Phase
                    .select('correct')
                    .mean();
                
                console.log("Mean main accuracy is ", meanAccPrac);
                // Continue with the experiment?
                out1 = (data.Phase == "Practice3" & trialNum == 20 & meanAccPrac < .70) ? true : false;
            }
        },
        trial_duration: () => {
            return (jsPsych.timelineVariable("Phase") == "Practice2") ? 10700 : 3700;
        }, 
        response_start_time: () => {
            return  1700;
        },
    };


    const feedback = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {
            const response = jsPsych.data.get().last(1).values()[0].key_press;
            if (response !== null) {
                const acc = jsPsych.data.get().last(1).values()[0].correct;
                if (jsPsych.timelineVariable("Phase") == "Omission" || jsPsych.timelineVariable("Phase").includes("Practice")) {
                    return (acc) ? `<p style="color: #ffff00; font-size: 2rem;">Correcto</p>` :
                        `<p style="color: #ff0000; font-size: 2rem;">Error</p>`;
                }
                const bonus = (jsPsych.timelineVariable("condition") == "High" &&
                    (jsPsych.timelineVariable("Phase") != "Extinction" && jsPsych.timelineVariable("Phase") != "Devaluation")) ?
                    `<div style="background-color: ${(acc) ? `#ffff00` : `#ff0000`}; color: black; font-size: 2rem; font-weight: 600; padding: 40px;">${(acc) ?
                        `¡Puntos Extra!` :
                        `Perdidas Extra`}</div></br>` :
                    '<div></div></br>';
                const points = jsPsych.data.get().last(1).values()[0].points;
                const gains = (acc) ?
                    `<p style="color: #ffff00; font-size: 2rem;">+${points} puntos</p>` :
                    `<p style="color: #ff0000; font-size: 2rem;">ERROR: ${points} puntos</p>`
                return bonus + gains;
            }
            return "<p style='font-size: 2rem;'>Demasiado lento. Intenta responder más rápido.</p>";
        },
        trial_duration: 700,
        choices: ["NO_KEYS"],
        post_trial_gap: () => {
            if (report_trial) return 500
            const phase = jsPsych.timelineVariable("Phase");
            if (phase == "Practice") {
                if (trialNum > 9 & pracCorr > .9) {
                    return 1000;
                }
                if (trialNum == 48) {
                    return 1000;
                }
            }
            if (phase == "Rewarded") {
                if (blocks/2 * 48 == trialNum) {
                    return 1000;
                }
            }
            return 0;
        },
        on_finish: () => {
            const phase = jsPsych.timelineVariable("Phase");
            // Maybe move Practice2 and Practice3 to report_rep
            if (phase == "Practice" || phase == "Practice2" || phase == "Practice3") {
                if ((trialNum > 9 & pracCorr > .9) & phase == "Practice") {
                    console.log('Participant reach threshold before ending the practice');
                    trialNum = 0;
                    BlockNum = 0;
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
                    jsPsych.endCurrentTimeline();
                }
                if (trialNum == 24 & phase == "Practice") {
                    trialNum = 0;
                    BlockNum = 0;
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
                }
            }
            if (phase == "Rewarded") {
                if (!report_trial) { // In case no report trial, make transition to awareness questions
                    if (blocks / 2 * 48 == trialNum) {
                        document.body.classList.remove("black");
                        document.body.style.cursor = 'auto';
                    }
                }
            }
        }
    }
    
    // Show conditionally at the end of the block
    const report_rep = {
        type: jsPsychPsychophysics,
        stimuli: () => {
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg; // If experiment is run in lab, custom px2deg
            const task = jsPsych.data.get().last(1).values()[0].task;
            if (task == "L") {
                const log = [0, 0, 0, 0, 0, 0];
                // Report location:
                return draw_display(1.15 * sF, 0.2 * sF, 5.05 * sF, log, // log is not necessary, but throw error if not provided :p
                    jsPsych.timelineVariable("colors"),
                    jsPsych.timelineVariable("orientation"), report_t = true);
            } else {
                // Report color:
                return [
                    draw_circle2(1.15 * sF, 0.2 * sF, colorHigh, -(3*sF), 0),
                    draw_circle2(1.15 * sF, 0.2 * sF, colorLow, +(3*sF), 0),
                ]
            }
        },
        background_color: '#000000',
        choices: ["c", "m"],
        canvas_width: () => { // Canvas size depends on stimulus size by default.
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg;
            return sF * 15; 
        },
        canvas_height: () => {
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg;
            return sF * 15;
        },
        on_finish: (data) => {
            const task = data.task;
            data.Phase = "Report";

            if (task == "L") {
                [2, 3, 4].includes(jsPsych.timelineVariable("singPos"))
                data.correct_response = ([2, 3, 4].includes(jsPsych.timelineVariable("singPos"))) ? "c" : "m";
                data.correct = (jsPsych.pluginAPI.compareKeys(data.response, data.correct_response)) ? 1 : 0;
            } else {
                data.correct_response = (jsPsych.timelineVariable("condition") == "High") ? "c" : "m";
                data.correct = (jsPsych.pluginAPI.compareKeys(data.response, data.correct_response)) ? 1 : 0;
            }

            correctReport += data.correct; // Update correct reports counter
            incorrectReport += 1 - data.correct; // If data.correct == 1, no updating. Otherwise, counter increase by 1.

            report_trial = jsPsych.timelineVariable("reportTrial");
            const phase = currentPhase;
            
            if (phase.includes("Practice")) {
                meanReportAccPrac = jsPsych.data.get()
                    .filterCustom(trial => trial.Phase === "Report") // Filter by Phase
                    .select('correct')
                    .mean();
                
                console.log("Report mean accuracy is ", meanReportAccPrac);
                // Continue with the experiment?
                out2 = (phase == "Practice3" & trialNum == 20 & meanReportAccPrac < .70) ? true : false;
            }

            if (trialNum == 10 & phase == "Practice2") {
                trialNum = 0; BlockNum = 0; correctReport = 0; incorrectReport = 0;
            }
            if (trialNum == 20 & phase == "Practice3") {
                trialNum = 0; BlockNum = 0; correctReport = 0; incorrectReport = 0;
                document.body.classList.remove("black");
                document.body.style.cursor = 'auto';
            }

            if (report_trial) {
                if (blocks / 2 * 48 == trialNum) {
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
                }
            }
        },

    };

    const pre_report = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div style="font-size: 100px; text-align: center;">R</div>',
        choices: "NO_KEYS",
        trial_duration: 1000
    };

    // Feedback for report trials (only practice)
    const feedback_report = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {
            const correct = jsPsych.data.get().last(1).values()[0].correct;
            return (correct) ? `<p style="color: #ffff00; font-size: 2rem;">Correcto</p>` : `<p style="color: #ff0000; font-size: 2rem;">Error</p>`;

        },
        trial_duration: 700,
        choices: ["NO_KEYS"],
        post_trial_gap: 0,
        on_finish: () => {
            const phase = jsPsych.timelineVariable("Phase");
            if (trialNum == 30 & phase.includes("Practice")) {
                    correctReport = 0; incorrectReport = 0;
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
            }
        }
    }
    const if_feedback_report = {
        timeline: [feedback_report],
            conditional_function: () => {
            return jsPsych.timelineVariable("Phase").includes("Practice");
        }
    }


    // First, letter R indicate that there is a report trial. Then, report trial.
    const if_report_rep = {
        timeline: [pre_report, report_rep, if_feedback_report],
        conditional_function: () => {
            return report_trial;
        }
    }

    const rest = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {
            const phase = jsPsych.data.get().last(2).values()[0].Phase;
            const rank = find_ranking(points_cut_off, total_points);
            const disp_medals = (rank >= 0) ? `
                           <p>Has desbloqueado la siguiente medalla:</p>
                           <img src="src/img/medals/${get_medal(rank)}" width="150" height="150">` : "";
            const next = (rank <= 4) ?
                `<p>Te quedan ${formatting(next_points(points_cut_off, rank + 1, total_points).toString())} puntos para desbloquear la siguiente medalla.</p>` :
                "";
            
            // Updating as a function of correct or incorrect report trials
            total_points = total_points + (correctReport + (-incorrectReport)) * 2000;

            return `
                       <p>Has completado ${BlockNum/2} de ${blocks/2} bloques.</p>
                       <p>Has acertado ${correctReport} y fallado ${incorrectReport} ensayos de reporte: ${(correctReport+(-incorrectReport))*2000} puntos.
                       ${`<p>Llevas ${formatting(total_points.toString())} puntos acumulados.</p>`}
                       ${(gam) ? disp_medals + next : ""}
                       <p>Pulsa la barra espaciadora cuando quieras continuar.</p>
                       `
        },
        choices: [' '],
        on_finish: () => {
            correctReport = 0; incorrectReport = 0; // Update counter
            if (jatos_run) {
                const results = jsPsych.data.get().filterCustom(filter_custom).json();
                jatos.submitResultData(results);
            }
        }
    }

    const transition = {
        type: jsPsychHtmlKeyboardResponse,
        // Hay que escalar los puntos en función de la segunda fase
        stimulus: () => {
            if (norew == "Reversal") {
                return `<p>Has terminado la primera mitad del experimento.</p>
                           <p>A partir de ahora van a cambiar las reglas que determinan los puntos que puedes ganar:</p>
                           <p>Si aparece el color ${colors_t(colorLow)}, ganarás 10 veces más puntos.</p>
                           <p>Si aparece el color ${colors_t(colorHigh)}, no ganarás puntos extra.</p>
                           <p>Pulsa la barra espaciadora para continuar con el experimento.</p>`
            }
            if (norew == "Extinction") {
                return `<p>Has terminado la primera mitad del experimento.</p>
                           <p style = "width: 80%; margin: auto">Ahora vas a continuar con la tarea, pero a partir de ahora el círculo ${colors_t(colorHigh)} ya no señala puntos extra. 
                           Ganarás los puntos que correspondan a tu rapidez en aciertos, 
                           como en el caso de los ensayos donde no hay colores o donde aparece el círculo ${colors_t(colorLow)}.</p>
                           <p>Pulsa la barra espaciadora para continuar con el experimento.</p>`
            } if (norew == "Omission") {
                return `<p>Has terminado la primera mitad del experimento.</p>
                           <p>Ahora vas a continuar con la tarea, <b style = "color:red"> pero ya no ganarás más puntos</b>.</p>
                           <p>Pulsa la barra espaciadora para continuar.</p>`
            }
            return `<p>Has terminado la primera mitad del experimento.</p>
                       <p>Ahora vas a continuar con la tarea, pero si aparece el círculo de ${colors_t(colorHigh)} la cantidad de puntos que ganarás será siempre 0.</p>
                       <p>Pulsa la barra espaciadora para continuar.</p>`;
        },
        choices: [" "],
        on_finish: () => {
            if (jatos_run) {
                const results = jsPsych.data.get().filterCustom(filter_custom).json();
                jatos.submitResultData(results);
            }
        }
    }

    // Maybe remove performance report?
    const report = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {
            total_points = total_points + (correctReport + (-incorrectReport)) * 2000;
            const rank = find_ranking(points_cut_off, total_points, r = true);
            const medal = (rank >= 0) ? `<p>Has acumulado ${formatting(total_points.toString())} puntos y desbloqueado la siguiente medalla: </p>
                       <img src="src/img/medals/${get_medal((rank > 5) ? rank - 1 : rank)}" width="150" height="150">` :
                `<p>Has acumulado ${formatting(total_points.toString())} puntos.</p>`;
            return `<p>Acabas de terminar el experimento.</p>
                       ${(gam) ? medal : ""}
                       <p>Pulsa la barra espaciadora para seguir.</p>`
        },
        choices: [' '],
        on_finish: () => {
            if (jatos_run) {
                const results = jsPsych.data.get().filterCustom(filter_custom).json();
                jatos.submitResultData(results);
            }
            document.body.classList.remove("black");
            document.body.style.cursor = 'auto';
        },
        post_trial_gap: 1000,
    };

    // Conditional 
    const if_call = {
        timeline: [call_experimenter],
        conditional_function: () => {
            return lab;
        }
    }

    const if_nodeRest = {
        timeline: [rest],
        conditional_function: () => {
        // Check if it's the end of every 48 trials
        if (trialNum % 48 === 0) {
            // Exclude specific points: 24 * blocks
            return trialNum !== (24 * blocks);
        }
            return false;
        }
    }

    const reward = {
        timeline: [trial, feedback, if_report_rep, if_nodeRest],
        timeline_variables: (blocks != 0) ? trialObj.Rewarded : [],
        repetitions: 1,
        randomize_order: false,
        post_trial_gap: () => {
            if (blocks == 0) {
                document.body.classList.remove("black");
                document.body.style.cursor = 'auto';
                return 1000;
            }
            return 0;
        }
    }


    const if_transition = {
        timeline: [transition],
        conditional_function: () => {
            return false;
        }
    }


    const if_reward = {
        timeline: [reward],
        conditional_function: () => {
            return blocks != 0;
        },
    }

    const repeat = {
        type: jsPsychHtmlButtonResponse,
        stimulus: () => {
            if (!fail && phase_out == "VMAC") {
                return wrapper(`<p>Ahora va a empezar al experimento.</p>
                   <p>El experimento va a constar de una tarea con ${`${(blocks/2).toString()} bloque${(blocks > 1) ? `s` : ``}`} de 48 ensayos (25 minutos).</p>
                   <p>Entre bloques podrás descansar si lo necesitas.</p>
                   <p>Pulsa comenzar para empezar el experimento.</p>`, true)
            } else if (!fail && phase_out.includes("Practice")) {
                return `<p>Has respondido correctamente a las preguntas.</p>
                <p>Pulsa <b>comenzar</b> para empezar con la práctica.</p>`;
            } else {
                return `<p>Lamentablemente no has respondido correctamente a alguna de las preguntas.</p>
                   <p>Por favor, lee las instrucciones con detenimiento.</p>`
            }
        },
        choices: () => {
            return (!fail) ? ["Comenzar"] : ["Volver a leer las instrucciones"];
        },
        post_trial_gap: () => {
            return (!fail) ? 1000 : 0;
        }
    }

        const repeatPrac = {
        type: jsPsychHtmlButtonResponse,
        stimulus: () => {
            if (!fail && phase_out == "VMAC") {
                return wrapper(`<p>Has respondido correctamente a todas las preguntas, pulsa comenzar para empezar con la práctica.</p>`, true)
            } else {
                return `<p>Lamentablemente no has respondido correctamente a alguna de las preguntas.</p>
                   <p>Por favor, lee las instrucciones con detenimiento.</p>`
            }
        },
        choices: () => {
            return (!fail) ? ["Comenzar"] : ["Volver a leer las instrucciones"];
        },
        post_trial_gap: () => {
            return (!fail) ? 1000 : 0;
        }
    }

    // Practice 1
    const practice = {
        timeline: [trial, feedback],
        timeline_variables: (blocks != 0) ? trialObj.Practice : [],
        repetitions: 1,
        randomize_order: false,
    }

    const if_practice = {
        timeline: [practice],
        conditional_function: () => {
            return prac; 
        }
    }
    
    // Practice 2 (First practice for dual task)
    const practice2 = {
        timeline: [trial, feedback, if_report_rep],
        timeline_variables: (blocks != 0) ? trialObj.Practice2 : [],
        repetitions: 1,
        randomize_order: false,
    }

    const if_practice2 = {
        timeline: [practice2],
        conditional_function: () => {
            return prac;
        }
    }

    const practice3 = {
        timeline: [trial, feedback, if_report_rep],
        timeline_variables: (blocks != 0) ? trialObj.Practice3 : [],
        repetitions: 1,
        randomize_order: false,
    }

    const if_practice3 = {
        timeline: [practice3],
        conditional_function: () => {
            return prac;
        }
    }

    const if_resize = {
        timeline: [resize, if_repeat_cal],
        loop_function: () => {
            return fail_cal;
        },
        conditional_function: () => {
            return !lab;
        }
    }

    const procedure_cal = {
        timeline: [welcome, instructions_cal, full_on, if_resize],
        repetitions: 1,
        randomize_order: false,
    }

const post_inst_prac = {
        type: jsPsychSurveyMultiChoice,
        questions: () => {
            const arr = shuffle([
                {
                    prompt: "¿Qué tecla debes pulsar si se te presenta una linea en posición vertical?",
                    name: 'line',
                    options: shuffle(['B', 'J', 'C']),
                    required: true,
                    horizontal: false
                },
                {
                    prompt: "¿A qué estímulo debes atender durante la tarea?",
                    name: 'feature',
                    options: shuffle(['Al estímulo con forma de rombo', 'Al estímulo con forma de círculo', 'Al estimulo con un color diferente']),
                    required: true,
                    horizontal: false
                },
            ]);
            return arr.filter((q) => q != null);
        },
        on_finish: (data) => {
            const resp = data.response;
            fail = resp.line != 'J' || resp.feature != 'Al estímulo con forma de rombo';
            phase_out = "Practice";
        }
    };

    

    const procedure_inst_prac = {
        timeline: [instructions_prac, post_inst_prac, repeat],
        loop_function: () => {
            return fail;
        },
        on_finish: () => {
            cont = (!fail) ? true : false;
            if (!fail && cont) {
                document.body.classList.add("black");
                document.body.style.cursor = 'none';
            }
        },
        //post_trial_gap: 0,
    }

    const procedure_prac = {
        timeline: [procedure_inst_prac, pre_prac, if_practice],
        repetitions: 1,
        randomize_order: false,
        post_trial_gap: () => { if (prac == false) return 1000 },
    }
    
    const post_inst_prac2 = {
        type: jsPsychSurveyMultiChoice,
        questions: () => {
            const arr = shuffle([
                            {
                    prompt: "¿Cuando ocurrirán estos ensayos de reporte?",
                    name: 'whenReport',
                    options: shuffle(['Después de cada ensayo de la tarea principal', 'Solo cuando se me presente la letra R en solitario después de un ensayo', 'Siempre que aparezca un distractor en un color diferente en la tarea principal']),
                    required: true,
                    horizontal: false
                },
                {
                    prompt: "¿Qué tienes que reportar en los ensayos de reporte?",
                    name: 'task',
                    options: shuffle(['El color del distractor del ensayo anterior', 'La posición del distractor del ensayo anterior', 'La posición del rombo en el ensayo anterior', 'El color del rombo en el ensayo anterior']),
                    required: true,
                    horizontal: false
                },
                {
                    prompt: "¿Qué teclas debes usar en la tarea de reporte para responder?",
                    name: 'mapping',
                    options: shuffle(['La letra C y la letra M', 'La letra B y la letra J', 'La letra C y la letra J', 'La letra B y la letra M']),
                    required: true,
                    horizontal: false
                }

            ]);
            return arr
        },
        on_finish: (data) => {
            const resp = data.response;
            const response = (data.task == "L") ? 'La posición del distractor del ensayo anterior' : 'El color del distractor del ensayo anterior';
            fail = resp.whenReport != 'Solo cuando se me presente la letra R en solitario después de un ensayo' ||
                resp.task != response ||
                resp.mapping != 'La letra C y la letra M';
            phase_out = "Practice2";
        }
    };
    

    const procedure_inst_prac2 = {
        timeline: [instructions_prac2, post_inst_prac2, repeat],
        loop_function: () => {
            return fail;
        },
        on_finish: () => {
            cont = (!fail) ? true : false;
            if (!fail && cont) {
                document.body.classList.add("black");
                document.body.style.cursor = 'none';
            }
        },
        //post_trial_gap: 0,
    }

    const procedure_prac2 = {
        timeline: [procedure_inst_prac2, pre_prac, if_practice2, pre_prac2, if_practice3],
        repetitions: 1,
        randomize_order: false,
        //post_trial_gap: () => { if (prac == false) return 1000 },
        on_finish: () => {
            cont = (!fail) ? true : false;
            if (!fail && cont) {
                document.body.classList.add("black");
                document.body.style.cursor = 'none';
            }
        },
    }

    const post_inst_exp = {
        type: jsPsychSurveyMultiChoice,
        questions: () => {
            const arr = shuffle([
                {
                    prompt: "¿Qué tecla debes pulsar si se te presenta una linea en posición vertical en la tarea principal?",
                    name: 'line',
                    options: shuffle(['B', 'J', 'C']),
                    required: true,
                    horizontal: false
                },
                {
                    prompt: "¿A qué estímulo debes atender durante la tarea principal?",
                    name: 'feature',
                    options: shuffle(['Al estímulo con forma de rombo', 'Al estímulo con forma de círculo', 'Al estimulo con un color diferente']),
                    required: true,
                    horizontal: false
                },
                {
                    prompt: "¿Cuál será tu tarea si se te presenta un ensayo de reporte?",
                    name: 'task',
                    options: shuffle(["Reportar la localización del distractor en el ensayo anterior", "Reportar el color del distractor en el ensayo anterior", "Reportar la localización del rombo en el ensayo anterior", "Reportar el color del rombo en el ensayo anterior"]),
                    required: true,
                    horizontal: false
                },
            ]);
            return arr.filter((q) => q != null);
        },
        on_finish: (data) => {
            const resp = data.response;
            const response = (data.task == "L") ? 'Reportar la localización del distractor en el ensayo anterior' : 'Reportar el color del distractor en el ensayo anterior';
            fail = resp.line != 'J' || resp.feature != 'Al estímulo con forma de rombo' || (resp.task != response);
            phase_out = "VMAC";
        }
    };

    // Makes this conditional as a function of jatos variable



    const procedure_inst_exp = {
        timeline: [instructions_exp, post_inst_exp, repeat],
        loop_function: () => {
            return fail;
        },
        on_finish: () => {
            cont = (!fail) ? true : false;
            if (!fail && cont) {
                document.body.classList.add("black");
                document.body.style.cursor = 'none';
            }
        },
        //post_trial_gap: 0,
    }

    const slide1 = {
        type: jsPsychHtmlSliderResponse,
        stimulus: () => {
            random_high_pos = random(1, 3);
            return `<div style="width:auto; margin-bottom: 50px;">
               <p>Durante el experimento, ¿pensaste que el color de los distractores estaba relacionado con los ensayos en los que podías ganar puntos extra de alguna manera?</p>
               </div>`
        },
        require_movement: true,
        slider_width: 750,
        prompt: "<p>Pulsa continuar cuando hayas acabado</p>",
        button_label: "Continuar",
        labels: ["No creo que estuviesen relacionados", "Creo que estaban totalmente relacionados"],
        on_finish: (data) => {
        data.Phase = "Awareness1";
        },
        //post_trial_gap: 500,
    };


    const slide2 = {
        type: jsPsychHtmlSliderResponse,
        stimulus: () => {
            random_high_pos = random(1, 3);
            return `<div style="width:auto; margin-bottom: 50px;">
               <p>¿Qué porcentaje de ensayos en los que podías ganar <b>puntos extra</b> crees que se han producido cuando el distractor se presentaba con cada color?</p>
               <div style="width:240px; float: left;">
                   <canvas id="myCanvas${random_high_pos}" width="150" height="150" style = "border-radius: 3%; background-color: #fff; margin: 10px 0;"></canvas>
               </div>
               <div style="width:240px; float: right;">
                   <canvas id="myCanvas${(random_high_pos == 1) ? 2 : 1}" width="150" height="150" style = "border-radius: 3%; background-color: #fff; margin: 10px 0;"></canvas>
               </div>
               </div>`
        },
        require_movement: true,
        slider_width: 750,
        labels: () => {
            let arr = [];
            arr[random_high_pos - 1] = `<span id="high-placeholder">50</span> % con el color ${colors_t(colorHigh)}`;
            arr[(random_high_pos == 2) ? 0 : 1] = `<span id="low-placeholder">50</span> % con el color ${colors_t(colorLow)}`;
            return arr;
        },
        prompt: "<p>Pulsa continuar cuando hayas acabado</p>",
        button_label: "Continuar",
        on_load: () => {
            document.addEventListener("click", slider_c);
            const slider = document.getElementsByClassName("jspsych-slider");
            slider[0].addEventListener("input", slider_move);

        },
        on_finish: (data) => {
            document.removeEventListener("click", slider_c);
            const out = (random_high_pos == 1) ? 100 - data.response : data.response;
            data.response = out;
            data.Phase = "Awareness2";
        },
        //post_trial_gap: 500,
    };

    const slide_confidence = {
        type: jsPsychHtmlSliderResponse,
        stimulus: () => {
            random_high_pos = random(1, 3);
            return `<div style="width:auto; margin-bottom: 50px;">
               <p>En una escala del 1 (ninguna confianza) al 100 (total confianza), ¿cuánta seguridad tienes en tu respuesta anterior?</p>
               </div>`
        },
        require_movement: true,
        labels: ["Ninguna confianza", "Total confianza"],
        prompt: '<p id = "placeholder" style = "margin-bottom:50px;">Tu respuesta: 50</p>',
        button_label: "Continuar",
        slider_width: 750,
        on_load: () => {
            document.addEventListener("input", (e) => {
                let p = document.getElementById("placeholder");
                let slider = document.getElementsByClassName("jspsych-slider");
                p.textContent = `Tu respuesta: ${slider[0].value}`;
            
            });
        },
        on_finish: (data) => {
            data.Phase = `Confidence${confidence_counter++}`;
        },
        //post_trial_gap: 500,
    };


    const slider_proc = {
        timeline: [slider_instr, slide1, slide_confidence, slide2, slide_confidence, quali_text],
    }

    const procedure_exp = {
        timeline: [procedure_inst_exp, pre_exp, if_reward],
        repetitions: 1,
        randomize_order: false,
        //post_trial_gap: 1000,
    }


    const download = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<p>¿Quieres descargar los datos?</p>`,
        choices: ["Sí", "No"],
        on_finish: (data) => {
            if (data.response == 0) {
                jsPsych.data.get().filterCustom(filter_custom).localSave("csv", "example.csv");
            }
        }
    }

    const if_download = {
        timeline: [download],
        conditional_function: () => {
            return !jatos_run;
        }
    }

    const out_id = {
        type: jsPsychHtmlButtonResponse,
        stimulus: () => {
            const id = jsPsych.data.get().last(1).values()[0].ID;
            return `
                   <p>Antes de terminar del experimento, apunta tu código de participante: ${id}</p>
               `
        },
        choices: ["Salir del experimento"]
    }

    // Removed consent, add later
    timeline.push(check_cond, check, preload,
        procedure_cal, procedure_prac, cond_func, procedure_prac2,
        procedure_exp, report, slider_proc, full_off, questions,
        if_download);

    jsPsych.run(timeline);
}
// Go!
if (jatos_run) {
    jatos.onLoad(() => run_experiment());
} else {
    run_experiment();
}
