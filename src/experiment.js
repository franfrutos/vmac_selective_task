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
       Phase: ${norew}. Blocks: ${blocks}. Practice: ${prac}. Condition: ${condition}. norew: ${norew}. gamify: ${gam}.`);
    
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

    // Assign condition after VMAC practice is finished:
    const cond_func = {
        type: jsPsychCallFunction,
        func: () => assign_condition(urlvar.condition),
    }

    // Experimental trial

    // Points necessary for earning medals. If reversal, points cut-offs are increased by a factor of 1.3
    const points_cut_off = [15500, 27200, 31900, 37300, 40000, 49300, 57000].map((p) => {
        return (norew == "Reversal" & p != 15500) ? p * 1.3 : p;
    })


    let trialNum = 0, total_points = 0, BlockNum = 0, fail = true, fial_cal = true, cont = false, phase_out = "VMAC", tReps = 0, dLocReps = 0, dColReps = 0, blockPoints = 0;

    const trial = {
        type: jsPsychPsychophysics,
        stimuli: () => {
            if (trialNum == 1) [tReps, dLocReps, dColReps] = [0, 0, 0]; // Reset repetions at the beginning of each block
            const sF = (lab) ? 40 : jsPsych.data.get().last(1).values()[0].px2deg; // If experiment is run in lab, custom px2deg
            const log = jsPsych.timelineVariable("trialLog");
            console.log(log);
            // Stimulus size is determined to an scaling factor that transform pixels to degrees of visual angle
            return draw_display(1.15 * sF, 0.2 * sF, 5.05 * sF, log, jsPsych.timelineVariable("colors"), jsPsych.timelineVariable("orientation"), jsPsych.timelineVariable("Phase"));
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
            let color, reps;
            if (jsPsych.timelineVariable("Phase") != "Reversal") {
                color = (jsPsych.timelineVariable("condition") == "High") ? colorHigh : (jsPsych.timelineVariable("condition") == "Low")? colorLow: "none";
            } else {
                color = (jsPsych.timelineVariable("condition") == "Low") ? colorHigh : (jsPsych.timelineVariable("condition") == "High")? colorLow: "none";
            }
            reps = [jsPsych.timelineVariable("targetPos"), jsPsych.timelineVariable("singPos"), jsPsych.timelineVariable("condition")];
            console.log(jsPsych.data.get().last(2).values()[0].tPos);
            console.log(reps);

            return {
                tPos: jsPsych.timelineVariable("targetPos"),
                sPos: jsPsych.timelineVariable("singPos"),
                Phase: jsPsych.timelineVariable("Phase"),
                condition: jsPsych.timelineVariable("condition"),
                Block_num: (trialNum % 24 == 0 && jsPsych.timelineVariable("Phase").includes("Rewarded"))  ? ++BlockNum : BlockNum,
                trial_num: ++trialNum,
                tLocRep: trialNum == 1 ? 0 : compare_repsL(jsPsych.data.get().last(2).values()[0].tPos, reps[0]) ? ++tReps : tReps,
                dLocRep: trialNum == 1 ? 0 : compare_repsL(jsPsych.data.get().last(2).values()[0].sPos, reps[1]) ? ++dLocReps : dLocReps,
                dColRep: trialNum == 1 ? 0: compare_repsC(jsPsych.data.get().last(2).values()[0].condition, reps[2]) ? ++dColReps : dColReps,
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
            console.log(data);
        },
        trial_duration: () => {
            return null
            return 3700;
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
                if (jsPsych.timelineVariable("Phase") == "Practice" || jsPsych.timelineVariable("Phase") == "Omission") {
                    return (acc) ? `<p style="color: #40E0D0; font-size: 2rem;">Correcto</p>` :
                        `<p style="color: #8765c2; font-size: 2rem;">Error</p>`;
                }
                const bonus = (jsPsych.timelineVariable("condition") == "High" &&
                    (jsPsych.timelineVariable("Phase") != "Extinction" && jsPsych.timelineVariable("Phase") != "Devaluation")) ?
                    `<div style="background-color: ${(acc) ? `#40E0D0` : `#8765c2`}; color: black; font-size: 2rem; font-weight: 600; padding: 40px;">${(acc) ?
                        `¡Puntos Extra!` :
                        `Perdidas Extra`}</div></br>` :
                    '<div></div></br>';
                const points = jsPsych.data.get().last(1).values()[0].points;
                const gains = (acc) ?
                    `<p style="color: #40E0D0; font-size: 2rem;">+${points} puntos</p>` :
                    `<p style="color: #8765c2; font-size: 2rem;">ERROR: ${points} puntos</p>`
                return bonus + gains;
            }
            return "<p style='font-size: 2rem;'>Demasiado lento. Intenta responder más rápido.</p>";
        },
        post_trial_gap: () => {
            const phase = jsPsych.data.get().last(1).values()[0].Phase;
            if ((phase == "Practice" && trialNum == 24) || (phase != "Rewarded" && trialNum == (24 * blocks) * 2)) return 1000;
        },
        trial_duration: 700,
        choices: ["NO_KEYS"],
        post_trial_gap: () => {
            const phase = jsPsych.timelineVariable("Phase");
            if (phase == "Practice") {
                if (trialNum == 24) {
                    return 1000;
                }
            }
            if (phase == "Rewarded") {
                if (blocks * 24 == trialNum) {
                    return 1000;
                }
            }
            return 0;
        },
        on_finish: () => {
            const phase = jsPsych.timelineVariable("Phase");
            if (phase == "Practice") {
                if (trialNum == 24) {
                    trialNum = 0;
                    BlockNum = 0;
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
                }
            }
            if (phase == "Rewarded") {
                if (blocks * 24 == trialNum) {
                    document.body.classList.remove("black");
                    document.body.style.cursor = 'auto';
                }
            }
        }
    }
    
    // Show conditionally at the end of the block
    // TODO: Modify this for variable conditions
    const report_rep = {
                type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {

            return `
            <p>Número de repeticiones T: ${tReps}</p>
            <p>Número de repeticiones T: ${dLocReps}</p>
            <p>Número de repeticiones T: ${dColReps}</p>
            `
        },
        choices: [' '],
        post_trial_gap: 1000,
    }

    const if_report_rep = {
        timeline: [report_rep],
        conditional_function: () => {
            if ((trialNum % 24 == 0 && trialNum != 24 * blocks) && (trialNum % 24 == 0 && trialNum != (24 * blocks) * 2)) {
                return true;
            } else {
                return false;
            };
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

            return `
                       <p>Has completado ${BlockNum} de ${blocks} Bloques.</p>
                       ${`<p>Llevas ${formatting(total_points.toString())} puntos acumulados.</p>`}
                       ${(gam) ? disp_medals + next : ""}
                       <p>Pulsa la barra espaciadora cuando quieras continuar.</p>
                       `
        },
        choices: [' '],
        on_finish: () => {
            if (jatos_run) {
                const results = jsPsych.data.get().filter([{ trial_type: "psychophysics" }, { trial_type: "survey-html-form" }]).json();
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
                const results = jsPsych.data.get().filter([{ trial_type: "psychophysics" }, { trial_type: "survey-html-form" }]).json();
                jatos.submitResultData(results);
            }
        }
    }

    const report = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: () => {
            const rank = find_ranking(points_cut_off, total_points, r = true);
            const medal = (rank >= 0) ? `<p>Has acumulado ${formatting(total_points.toString())} puntos y desbloqueado la siguiente medalla: </p>
                       <img src="src/img/medals/${get_medal((rank > 5) ? rank - 1 : rank)}" width="150" height="150">` :
                `<p>Has acumulado ${formatting(total_points.toString())} puntos.</p>`;
            return `<p>Acabas de terminar el experimento.</p>
                       ${(gam) ? medal + report_performance(rank) : ""}
                       <p>Antes de salir de esta página nos gustaría que respondieses unas breves preguntas.</p>
                       <p>Pulsa la barra espaciadora para seguir.</p>`
        },
        choices: [' '],
        on_finish: () => {
            if (jatos_run) {
                const results = jsPsych.data.get().filter([{ trial_type: "psychophysics" }, { trial_type: "survey-html-form" }]).json();
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
            if ((trialNum % 24 == 0 && trialNum != 24 * blocks) && (trialNum % 24 == 0 && trialNum != (24 * blocks) * 2)) {
                [tReps, dLocReps, dColReps] = [0, 0, 0]; // Reset repetions at the beginning of each block
                blockPoints = 0 // Reset block point counter
                return true;
            } else {
                return false;
            };
        },
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
                   <p>El experimento va a constar de una tarea con ${`${blocks.toString()} bloque${(blocks > 1) ? `s` : ``}`} de 24 ensayos (25 minutos).</p>
                   <p>Entre bloques podrás descansar si lo necesitas.</p>
                   <p>Pulsa comenzar para empezar el experimento.</p>`, true)
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

    const repeat_cal = {
        type: jsPsychHtmlButtonResponse,
        stimulus: () => {
            const distance = jsPsych.data.get().last(1).values()[0].view_dist_mm;
            console.log(jsPsych.data.get().last(1).values());
            return `<p>Hemos estimado que te encuentras a la siguiente distancia de la pantalla: ${parseInt(distance / 10)} cm </p>.
            <p>Esto significa que te encuentras muy cerca o muy lejos de la pantalla, o que no hemos conseguido estimar correctamente esa distancia.</p>
            <p>Dado que está calibración es crítica para hacer correctamente el experimento, te vamos a pedir que la vuelvas a realizar.</p>
            <p>En caso de que realmente te encontrases a esa distancia, por favor, colocate a una distancia de entre <b>35 y 75 cm</b> de la pantalla para poder realizar la tarea con comodidad.</p>`
        },
        choices: () => {
            return  ["Volver a realizar la calibración"];
        },
    }

    const if_repeat_cal = {
        timeline: [repeat_cal],
        conditional_function: () => {
            return fail_cal;
        }
    }
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

    const if_resize = {
        timeline: [resize, repeat_cal],
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

    // I need to include practice trials for both the location and the color task
    const procedure_prac = {
        timeline: [instructions_prac, pre_prac, if_practice],
        repetitions: 1,
        randomize_order: false,
        post_trial_gap: () => { if (prac == false) return 1000 },
    }


    const post_inst_exp = {
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
                (condition.includes("A")) ? {
                    prompt: "¿En qué situaciones podrás ganar 10 veces más puntos?",
                    name: 'value',
                    options: shuffle([`Cuando en pantalla aparece el color ${colors_t(colorHigh)}`, `Cuando en pantalla aparece el color ${colors_t(colorLow)}`, 'Cuando en pantalla no aparece ningún color']),
                    required: true,
                    horizontal: false
                } : null,
            ]);
            return arr.filter((q) => q != null);
        },
        on_finish: (data) => {
            const resp = data.response;
            fail = resp.line != 'J' || resp.feature != 'Al estímulo con forma de rombo' || (resp.value != `Cuando en pantalla aparece el color ${colors_t(colorHigh)}` && resp.value != undefined);
            phase_out = "VMAC";
        }
    };

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



    const slide = {
        type: jsPsychHtmlSliderResponse,
        stimulus: () => {
            random_high_pos = random(1, 3);
            return `<div style="width:auto; margin-bottom: 50px;">
               <p>¿Qué porcentaje de puntos crees que has ganado con cada color?</p>
               <div style="width:240px; float: left;">
                   <canvas id="myCanvas${random_high_pos}" width="150" height="150" style = "border-radius: 3%; background-color: #fff; margin: 10px 0;"></canvas>
               </div>
               <div style="width:240px; float: right;">
                   <canvas id="myCanvas${(random_high_pos == 1) ? 2 : 1}" width="150" height="150" style = "border-radius: 3%; background-color: #fff; margin: 10px 0;"></canvas>
               </div>
               </div>`
        },
        require_movement: true,
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
            jsPsych.data.addProperties({
                contingency_rating1: out,
            })
            data.Phase = "Contingency"
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
            jsPsych.data.addProperties({
                confidence_rating1: data.response,
            })
            data.Phase = "Confidence"

        },
        //post_trial_gap: 500,
    };


    const slider_proc = {
        timeline: [slider_instr, slide, slide_confidence],
        conditional_function: () => {
            return condition.includes("2") || (condition.includes("1"))
        }
    }

    const procedure_exp = {
        timeline: [procedure_inst_exp, pre_exp, if_reward, slider_proc, if_transition, report, slider_proc],
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
                jsPsych.data.get().filter([{ trial_type: "psychophysics" }, { trial_type: "survey-html-form" }]).localSave("csv", "example.csv");
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

    timeline.push(check_cond, check, preload, consent_proc, procedure_cal, procedure_prac, cond_func, procedure_exp, full_off, questions, if_download);

    jsPsych.run(timeline);
}
// Go!
if (jatos_run) {
    jatos.onLoad(() => run_experiment());
} else {
    run_experiment();
}
