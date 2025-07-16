// Константы для расчетов энтальпии
const CONSTANTS = {
    water: {
        gas: {
            a: 33.46,
            b: 0.00688,
            c: 0.0000767,
            d: -0.0000000344,
            baseEnthalpy: 44010 // Дж/моль
        },
        liquid: {
            a: 75.44,
            b: 0,
            c: 0,
            d: 0,
            baseEnthalpy: 0 // Дж/моль
        },
        solid: {
            a: 38.12,
            b: 0.0139,
            c: 0,
            d: 0,
            baseEnthalpy: -6010 // Дж/моль
        }
    },
    nitrogen: {
        gas: {
            a: 28.58,
            b: 0.00383,
            c: 0.0000105,
            d: -0.0000000196,
            baseEnthalpy: 0 // Дж/моль
        },
        liquid: {
            a: 31.15,
            b: 0.0136,
            c: 0,
            d: 0,
            baseEnthalpy: -5570 // Дж/моль
        },
        solid: {
            a: 22.89,
            b: 0.0123,
            c: 0,
            d: 0,
            baseEnthalpy: -6920 // Дж/моль
        }
    },
    oxygen: {
        gas: {
            a: 29.96,
            b: 0.00418,
            c: -0.00000167,
            d: 0.00000000315,
            baseEnthalpy: 0 // Дж/моль
        },
        liquid: {
            a: 26.02,
            b: 0.0108,
            c: 0,
            d: 0,
            baseEnthalpy: -6400 // Дж/моль
        },
        solid: {
            a: 23.34,
            b: 0.0101,
            c: 0,
            d: 0,
            baseEnthalpy: -8680 // Дж/моль
        }
    },
    carbon_dioxide: {
        gas: {
            a: 44.22,
            b: 0.00884,
            c: -0.00000861,
            d: 0.00000000279,
            baseEnthalpy: -393510 // Дж/моль
        },
        liquid: {
            a: 86.47,
            b: 0,
            c: 0,
            d: 0,
            baseEnthalpy: -413800 // Дж/моль
        },
        solid: {
            a: 44.22,
            b: 0.00884,
            c: 0,
            d: 0,
            baseEnthalpy: -427400 // Дж/моль
        }
    },
    methane: {
        gas: {
            a: 34.31,
            b: 0.05469,
            c: 0.00000344,
            d: -0.0000000111,
            baseEnthalpy: -74520 // Дж/моль
        },
        liquid: {
            a: 52.93,
            b: 0,
            c: 0,
            d: 0,
            baseEnthalpy: -89040 // Дж/моль
        },
        solid: {
            a: 34.31,
            b: 0.05469,
            c: 0,
            d: 0,
            baseEnthalpy: -94050 // Дж/моль
        }
    }
};

const PHASE_TRANSITIONS = {
    water: {
        melt: { temp: 273.15, enthalpy: 6010 }, // плавление
        boil: { temp: 373.15, enthalpy: 44010 } // парообразование
    },
    nitrogen: {
        melt: { temp: 63.15, enthalpy: 692 }, // плавление
        boil: { temp: 77.36, enthalpy: 5600 } // парообразование
    },
    oxygen: {
        melt: { temp: 54.36, enthalpy: 138 }, // плавление
        boil: { temp: 90.20, enthalpy: 6820 } // парообразование
    },
    carbon_dioxide: {
        melt: { temp: 216.58, enthalpy: 9000 }, // сублимация (нет жидкой фазы при 1 атм)
        boil: { temp: 194.65, enthalpy: 0 } // фиктивно
    },
    methane: {
        melt: { temp: 90.67, enthalpy: 1170 }, // плавление
        boil: { temp: 111.66, enthalpy: 8200 } // парообразование
    }
};

// молярные массы веществ (г/моль)
const MOLAR_MASS = {
    water: 18.01528,
    nitrogen: 28.0134,
    oxygen: 31.9988,
    carbon_dioxide: 44.0095,
    methane: 16.0425
};

// нормальные условия - температура (K)
const STANDARD_TEMP = 298.15;

// функция для расчета энтальпии
function calculateEnthalpyBetweenStates(substance, t1, p1, t2, p2, phase2) {
    // здесь определяем фазу в конечной точке
    let usedPhase2 = phase2;
    if (phase2 === 'auto') {
        usedPhase2 = getPhase(substance, t2);
    } else {
        // проверяем допустимость выбранной фазы
        if (!isPhaseAllowed(substance, t2, phase2)) {
            return {
                value: null,
                explanation: 'Ошибка: выбранная конечная фаза не соответствует введённой температуре. Измените фазу или температуру.'
            };
        }
    }

    // упорядочим начальное и конечное состояния по температуре
    let tLow = t1, tHigh = t2, pLow = p1, pHigh = p2;
    let sign = 1;
    if (t2 < t1) {
        tLow = t2; tHigh = t1; pLow = p2; pHigh = p1;
        sign = -1;
    }

    const constants = CONSTANTS[substance];
    const molarMass = MOLAR_MASS[substance];
    const pt = PHASE_TRANSITIONS[substance];

    let enthalpy = 0;
    let explanation = '';

    // фазовые переходы
    if (tLow < pt.melt.temp && tHigh > pt.melt.temp) {

        enthalpy += integrateCp(constants.solid, tLow, pt.melt.temp);
        enthalpy += pt.melt.enthalpy;
        explanation += `Переход через плавление: +${pt.melt.enthalpy} Дж/моль<br>`;

        if (tHigh > pt.boil.temp) {

            enthalpy += integrateCp(constants.liquid, pt.melt.temp, pt.boil.temp);
            enthalpy += pt.boil.enthalpy;
            explanation += `Переход через кипение: +${pt.boil.enthalpy} Дж/моль<br>`;
            enthalpy += integrateCp(constants.gas, pt.boil.temp, tHigh);

        } else {
            enthalpy += integrateCp(constants.liquid, pt.melt.temp, tHigh);
        }
    } else if (tLow < pt.boil.temp && tHigh > pt.boil.temp) {

        enthalpy += integrateCp(constants.liquid, tLow, pt.boil.temp);
        enthalpy += pt.boil.enthalpy;
        explanation += `Переход через кипение: +${pt.boil.enthalpy} Дж/моль<br>`;
        enthalpy += integrateCp(constants.gas, pt.boil.temp, tHigh);

    } else if (tHigh <= pt.melt.temp) {
        enthalpy += integrateCp(constants.solid, tLow, tHigh);
    } else if (tLow >= pt.boil.temp) {
        enthalpy += integrateCp(constants.gas, tLow, tHigh);
    } else {
        enthalpy += integrateCp(constants.liquid, tLow, tHigh);
    }

    // влияние давления (только для газа)
    let pressureEffect = 0;
    // для газа или смеси газ/жидкость на границе кипения
    if (usedPhase2 === 'gas' || usedPhase2 === 'liquid/gas') {
        pressureEffect = 8.314 * tHigh * Math.log(pHigh / pLow);
        explanation += `Влияние давления: ${pressureEffect.toFixed(2)} Дж/моль<br>`;
    }

    let totalEnthalpy = sign * (enthalpy + pressureEffect);
    let massEnthalpy = totalEnthalpy / molarMass;

    explanation = `Расчет энтальпии для ${getSubstanceName(substance)} между ${t1} K, ${p1} Па и ${t2} K, ${p2} Па (конечная фаза: ${getPhaseName(usedPhase2)}):<br>` + explanation;
    explanation += `1. Общая энтальпия: <span class="result-value">${totalEnthalpy.toFixed(2)} Дж/моль</span><br>`;
    explanation += `2. Молярная масса: <span class="result-value">${molarMass.toFixed(5)} г/моль</span><br>`;
    explanation += `3. Энтальпия на единицу массы: <span class="result-value">${massEnthalpy.toFixed(2)} Дж/г = ${(massEnthalpy / 1000).toFixed(2)} кДж/кг</span>`;
    return {
        value: (massEnthalpy / 1000).toFixed(2),
        explanation: explanation
    };
}

// функция интеграла
function integrateCp(c, t1, t2) {
    return (
        c.a * (t2 - t1) +
        (c.b / 2) * (Math.pow(t2, 2) - Math.pow(t1, 2)) +
        (c.c / 3) * (Math.pow(t2, 3) - Math.pow(t1, 3)) +
        (c.d / 4) * (Math.pow(t2, 4) - Math.pow(t1, 4))
    );
}


// функция для определения допустимости фазы при данной температуре
function isPhaseAllowed(substance, T, phase) {
    const pt = PHASE_TRANSITIONS[substance];
    // граничный диапазон ±1K
    const eps = 1.0;
    if (phase === 'solid') {
        return T < pt.melt.temp + eps;
    }
    if (phase === 'liquid') {
        return T > pt.melt.temp - eps && T < pt.boil.temp + eps;
    }
    if (phase === 'gas') {
        return T > pt.boil.temp - eps;
    }
    return true; // auto
}

function getPhase(substance, T) {
    const pt = PHASE_TRANSITIONS[substance];
    const eps = 1.0;
    if (T < pt.melt.temp - eps) return 'solid';
    if (T > pt.boil.temp + eps) return 'gas';
    if (T > pt.melt.temp + eps && T < pt.boil.temp - eps) return 'liquid';
    // граничные случаи, для автоматически возвращаем фазу, в которую вещество перейдёт при длительном пребывании
    if (Math.abs(T - pt.melt.temp) <= eps) return 'liquid'; // после плавления  жидкость
    if (Math.abs(T - pt.boil.temp) <= eps) return 'gas';    // после кипения  газ
    return 'unknown';
}

function showCalculationDetails(result, t1, t2, p1, p2, substance, phase2) {
    const pt = PHASE_TRANSITIONS[substance];
    let steps = [];
    let phaseStart = getPhase(substance, t1);
    let phaseEnd = (phase2 === 'auto') ? getPhase(substance, t2) : phase2;

    // 1. определение фаз
    steps.push(`1. <b>Определение фаз:</b>`);
    steps.push(`&nbsp;&nbsp;Начальная температура: <b>${t1} K</b> — фаза: <b>${getPhaseName(phaseStart)}</b>`);
    steps.push(`&nbsp;&nbsp;Конечная температура: <b>${t2} K</b> — фаза: <b>${getPhaseName(phaseEnd)}</b>`);

    // 2. вычисление интегралы теплоёмкости
    steps.push(`2. <b>Вычисление интегралов теплоёмкости:</b>`);
    if (t1 < pt.melt.temp && t2 > pt.melt.temp) {
        steps.push(`&nbsp;&nbsp;∫<sub>${t1}</sub><sup>${pt.melt.temp}</sup> C<sub>p,тв</sub>(T) dT`);
        if (t2 > pt.boil.temp) {
            steps.push(`&nbsp;&nbsp;∫<sub>${pt.melt.temp}</sub><sup>${pt.boil.temp}</sup> C<sub>p,ж</sub>(T) dT`);
            steps.push(`&nbsp;&nbsp;∫<sub>${pt.boil.temp}</sub><sup>${t2}</sup> C<sub>p,г</sub>(T) dT`);
        } else {
            steps.push(`&nbsp;&nbsp;∫<sub>${pt.melt.temp}</sub><sup>${t2}</sup> C<sub>p,ж</sub>(T) dT`);
        }
    } else if (t1 < pt.boil.temp && t2 > pt.boil.temp) {
        steps.push(`&nbsp;&nbsp;∫<sub>${t1}</sub><sup>${pt.boil.temp}</sup> C<sub>p,ж</sub>(T) dT`);
        steps.push(`&nbsp;&nbsp;∫<sub>${pt.boil.temp}</sub><sup>${t2}</sup> C<sub>p,г</sub>(T) dT`);
    } else if (t2 <= pt.melt.temp) {
        steps.push(`&nbsp;&nbsp;∫<sub>${t1}</sub><sup>${t2}</sup> C<sub>p,тв</sub>(T) dT`);
    } else if (t1 >= pt.boil.temp) {
        steps.push(`&nbsp;&nbsp;∫<sub>${t1}</sub><sup>${t2}</sup> C<sub>p,г</sub>(T) dT`);
    } else {
        steps.push(`&nbsp;&nbsp;∫<sub>${t1}</sub><sup>${t2}</sup> C<sub>p,ж</sub>(T) dT`);
    }

    // 3. теплота фазовых переходов
    steps.push(`3. <b>Теплоты фазовых переходов:</b>`);
    if ((t1 < pt.melt.temp && t2 > pt.melt.temp) || (t1 > pt.melt.temp && t2 < pt.melt.temp)) {
        const direction = t2 > t1
            ? 'плавления'
            : 'кристаллизации';
        steps.push(`&nbsp;&nbsp;Учет теплоты ${direction}: <b>${t2 > t1 ? '+' : '-'}${pt.melt.enthalpy} Дж/моль</b>`);
    } else {
        steps.push(`&nbsp;&nbsp;Плавление/кристаллизация не учитывается`);
    }
    if ((t1 < pt.boil.temp && t2 > pt.boil.temp) || (t1 > pt.boil.temp && t2 < pt.boil.temp)) {
        const direction = t2 > t1
            ? 'парообразования'
            : 'конденсации';
        steps.push(`&nbsp;&nbsp;Учет теплоты ${direction}: <b>${t2 > t1 ? '+' : '-'}${pt.boil.enthalpy} Дж/моль</b>`);
    } else {
        steps.push(`&nbsp;&nbsp;Парообразование/конденсация не учитывается`);
    }

    // 4. влияние давления
    steps.push(`4. <b>Влияние давления:</b>`);
    if (phaseEnd === 'gas' || phaseEnd === 'liquid/gas') {
        steps.push(`&nbsp;&nbsp;Добавлен вклад: <b>R·T·ln(P<sub>2</sub>/P<sub>1</sub>)</b>`);
    } else {
        steps.push(`&nbsp;&nbsp;Влияние давления не учитывается`);
    }

    // 5. итог
    steps.push(`<br><b>Результат:</b><br>${result.explanation}`);

    document.getElementById('explain-details').innerHTML = steps.join('<br>');
}

// вспомогательные функции для получения названий
function getSubstanceName(substanceKey) {
    const names = {
        water: 'воды (H₂O)',
        nitrogen: 'азота (N₂)',
        oxygen: 'кислорода (O₂)',
        carbon_dioxide: 'углекислого газа (CO₂)',
        methane: 'метана (CH₄)'
    };
    return names[substanceKey] || substanceKey;
}

function getPhaseName(phaseKey) {
    const names = {
        gas: 'газ',
        liquid: 'жидкость',
        solid: 'твердое тело'
    };
    return names[phaseKey] || phaseKey;
}


// автоматически заполнить
document.getElementById('auto-fill-btn').addEventListener('click', function() {
    const substances = ['water', 'nitrogen', 'oxygen', 'carbon_dioxide', 'methane'];
    const substance = substances[Math.floor(Math.random() * substances.length)];
    document.getElementById('substance').value = substance;

    // примерные диапазоны температур и давлений
    let tMin = 50, tMax = 500;
    if (substance === 'water') tMax = 600;
    document.getElementById('temperature').value = (Math.random() * (tMax - tMin) + tMin).toFixed(1);
    document.getElementById('pressure').value = (Math.random() * (2e5 - 1e4) + 1e4).toFixed(0);
    document.getElementById('temperature2').value = (Math.random() * (tMax - tMin) + tMin).toFixed(1);
    document.getElementById('pressure2').value = (Math.random() * (2e5 - 1e4) + 1e4).toFixed(0);
    document.getElementById('phase2').value = 'auto';
});

// кнопка "сбросить"
document.getElementById('reset-btn').addEventListener('click', function() {
    document.getElementById('temperature').value = '';
    document.getElementById('pressure').value = '';
    document.getElementById('temperature2').value = '';
    document.getElementById('pressure2').value = '';
    document.getElementById('phase2').value = 'auto';
    document.getElementById('enthalpy-value').textContent = '-';
    document.getElementById('explanation').textContent = '';
    document.getElementById('explain-details').style.display = 'none';
    document.getElementById('explain-details').innerHTML = '';
});


// кнопка "пояснить расчёт"
document.getElementById('explain-btn').addEventListener('click', function() {
    const details = document.getElementById('explain-details');
    if (
        !document.getElementById('enthalpy-value').textContent ||
        document.getElementById('enthalpy-value').textContent === '-' ||
        document.getElementById('enthalpy-value').textContent === 'Ошибка' ||
        document.getElementById('enthalpy-value').textContent === 'Невозможно рассчитать'
    ) {
        details.style.display = 'block';
        details.innerHTML = '<span style="color:#c00;">Нет данных для пояснения. Сначала выполните корректный расчёт.</span>';
        return;
    }
    if (details.style.display === 'none' || details.style.display === '') {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
});

// скрывать ошибку при нажатии других кнопок:
['reset-btn', 'auto-fill-btn', 'calculate-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', function() {
        const details = document.getElementById('explain-details');
        if (
            details.innerHTML.includes('Нет данных для пояснения')
        ) {
            details.style.display = 'none';
            details.innerHTML = '';
        }
    });
});


document.getElementById('calculate-btn').addEventListener('click', function() {
    const resultElement = document.getElementById('enthalpy-value');
    const explanationElement = document.getElementById('explanation');
    const t1 = parseFloat(document.getElementById('temperature').value);
    const p1 = parseFloat(document.getElementById('pressure').value);
    const t2 = parseFloat(document.getElementById('temperature2').value);
    const p2 = parseFloat(document.getElementById('pressure2').value);
    const substance = document.getElementById('substance').value;
    const phase2 = document.getElementById('phase2').value;

    if (
        !substance ||
        isNaN(t1) || isNaN(p1) || isNaN(t2) || isNaN(p2) ||
        t1 <= 0 || p1 <= 0 || t2 <= 0 || p2 <= 0
    ) {
        resultElement.textContent = 'Ошибка';
        explanationElement.textContent = 'Пожалуйста, введите корректные значения температур и давлений (положительные числа).';
        document.getElementById('explain-details').style.display = 'none';
        document.getElementById('explain-details').innerHTML = '';
        return;
    }

    const result = calculateEnthalpyBetweenStates(substance, t1, p1, t2, p2, phase2);

    if (result.value === null) {
        resultElement.textContent = 'Невозможно рассчитать';
        explanationElement.innerHTML = result.explanation;
        document.getElementById('explain-details').style.display = 'none';
        document.getElementById('explain-details').innerHTML = '';
    } else {
        resultElement.textContent = result.value + ' кДж/кг';
        explanationElement.innerHTML = result.explanation;
        showCalculationDetails(result, t1, t2, p1, p2, substance, phase2);
    }
});