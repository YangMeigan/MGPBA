"use strict";
window.RLQ = window.RLQ || [];
window.RLQ.push(async () => {
    const studentStatList = ['MaxHP','AttackPower','DefensePower','HealPower','AccuracyPoint','DodgePoint','CriticalPoint','CriticalChanceResistPoint','CriticalDamageRate','CriticalDamageResistRate','StabilityPoint','Range','OppressionPower','OppressionResist','HealEffectivenessRate','AmmoCount', 'AmmoCost'];
    const zhNumbers = ['零', '一', '二', '三', '四', '五']

    await mw.loader.using(["mediawiki.api", "ext.gadget.LocalObjectStorage"]);
    const storage = new LocalObjectStorage("ba-charinfo");
    let rawData = storage.getItem("data");
    // If cache has been updated in this session
    let updatedNow = false;
    const updateCache = async () => {
        const api = new mw.Api();
        rawData = JSON.parse(
            (
                await api.get({
                    action: "parse",
                    page: "Module:BACharInfo/data",
                    prop: "wikitext",
                })
            ).parse.wikitext["*"],
        );
        storage.setItem("data", rawData);
        storage.setItem("last-fetched", Date.now());
        updatedNow = true;
    };
    if (!rawData || Date.now() - storage.getItem("last-fetched") > 15 * 24 * 60 * 60 * 1000) {
        await updateCache();
    }

    // From SchaleDB by lonqie
    // https://lonqie.github.io/SchaleDB
    // https://github.com/lonqie/SchaleDB/blob/main/js/common.js
    const starscale_hp = [1, 1.05, 1.12, 1.21, 1.35],
        starscale_attack = [1, 1.1, 1.22, 1.36, 1.53],
        starscale_healing = [1, 1.075, 1.175, 1.295, 1.445],
        striker_bonus_coefficient = { MaxHP: 0.1, AttackPower: 0.1, DefensePower: 0.05, HealPower: 0.05 };
    class CharacterStats {
        constructor(character, level = 1, stargrade) {
            if(!stargrade) stargrade = character.Rate;
            const levelscale = ((level - 1) / 99).toFixed(4);
            const MaxHP = Math.ceil(
                (
                    Math.round((character.MaxHP1 + (character.MaxHP100 - character.MaxHP1) * levelscale).toFixed(4)) * starscale_hp[stargrade - 1]
                ).toFixed(4),
            );
            const AttackPower = Math.ceil(
                (
                    Math.round((character.AttackPower1 + (character.AttackPower100 - character.AttackPower1) * levelscale).toFixed(4)) *
                    starscale_attack[stargrade - 1]
                ).toFixed(4),
            );
            const DefensePower = Math.round(
                (character.DefensePower1 + (character.DefensePower100 - character.DefensePower1) * levelscale).toFixed(4),
            );
            const HealPower = Math.ceil(
                (
                    Math.round((character.HealPower1 + (character.HealPower100 - character.HealPower1) * levelscale).toFixed(4)) *
                    starscale_healing[stargrade - 1]
                ).toFixed(4),
            );
            this.stats = {
                MaxHP: [MaxHP, 0, 1],
                AttackPower: [AttackPower, 0, 1],
                DefensePower: [DefensePower, 0, 1],
                HealPower: [HealPower, 0, 1],
                AccuracyPoint: [character.AccuracyPoint, 0, 1],
                DodgePoint: [character.DodgePoint, 0, 1],
                CriticalPoint: [character.CriticalPoint, 0, 1],
                CriticalDamageRate: [character.CriticalDamageRate, 0, 1],
                CriticalChanceResistPoint: [100, 0, 1],
                CriticalDamageResistRate: [5000, 0, 1],
                StabilityPoint: [character.StabilityPoint, 0, 1],
                AmmoCount: [character.AmmoCount, 0, 1],
                AmmoCost: [character.AmmoCost, 0, 1],
                Range: [character.Range, 0, 1],
                RegenCost: [character.RegenCost, 0, 1],
                HealEffectivenessRate: [10000, 0, 1],
                OppressionPower: [100, 0, 1],
                OppressionResist: [100, 0, 1],
                AttackSpeed: [10000, 0, 1],
                BlockRate: [0, 0, 1],
                DefensePenetration: [0, 0, 1],
                MoveSpeed: [10000, 0, 1],
            };
        }

        addBuff(stat, amount) {
            const stat_split = stat.split("_");
            if (stat_split.length > 1) {
                if (stat_split[1] === "Base") {
                    this.stats[stat_split[0]][1] += amount;
                } else if (stat_split[1] === "Coefficient") {
                    this.stats[stat_split[0]][2] += amount / 10000;
                }
            } else {
                this.stats[stat_split[0]][1] += amount;
            }
        }

        /**
         * Adds the specified stat from another instance of CharacterStats as a flat buff
         * @param {CharacterStats} chStats the instance of CharacterStats to add from
         * @param {*} stat the name of the stat to add
         * @param {*} coefficient the amount of the stat to add
         */
        addCharacterStatsAsBuff(chStats, stat, coefficient) {
            this.stats[stat][1] += Math.round(chStats.getTotal(stat) * (coefficient / 10000));
        }

        /**
         * Calculates the final total of a stat with all flat and percentage buffs
         * @param {string} stat The name of the stat
         * @returns
         */
        getTotal(stat) {
            return Math.round(((this.stats[stat][0] + this.stats[stat][1]) * this.stats[stat][2]).toFixed(4));
        }

        /**
         * Calculates and returns the final total of a stat as a locale-formatted string
         * @param {*} stat
         * @returns
         */
        getTotalString(stat) {
            const total = this.getTotal(stat);
            if (CharacterStats.isRateStat(stat)) {
                return `${(total / 100).toFixed(0).toLocaleString()}%`;
            }
            return total.toLocaleString();
        }

        /**
         * Returns the base stat as a locale-formatted string
         * @param {*} stat
         * @returns
         */
        getBaseString(stat) {
            const total = this.stats[stat][0];
            if (CharacterStats.isRateStat(stat)) {
                return `${(total / 100).toFixed(0).toLocaleString()}%`;
            }
            return total.toLocaleString();
        }

        /**
         * Returns the flat buff as a locale-formatted string
         * @param {*} stat
         * @returns
         */
        getFlatString(stat) {
            return `+${this.stats[stat][1].toLocaleString()}`;
        }

        /**
         * Returns the coefficient percent buff as a locale-formatted string
         * @param {*} stat
         * @returns
         */
        getCoefficientString(stat) {
            return `+${parseFloat(((this.stats[stat][2] - 1) * 100).toFixed(1)).toLocaleString()}%`;
        }

        getStrikerBonus(stat) {
            return Math.floor(((this.stats[stat][0] + this.stats[stat][1]) * this.stats[stat][2]).toFixed(4) * striker_bonus_coefficient[stat]);
        }

        getStabilityMinDamage() {
            const stability = this.getTotal("StabilityPoint");
            return `${parseFloat(((stability / (stability + 997) + 0.2) * 100).toFixed(2))}%`;
        }

        static isRateStat(stat) {
            return stat.slice(-4) === "Rate" || stat.startsWith("AttackSpeed");
        }
    }

    function recalculateStats($el, level, character, stargrade){//还是按卡面现实
        if(!stargrade) stargrade = character.Rate;
        //let level = $el.find(".bachar-char-expbar");
        let studentStats = new CharacterStats(character, level, stargrade);

        studentStatList.forEach(statname => {
            if(statname == "CriticalDamageRate"){
                var statCriticalRate = studentStats.stats[statname][0] / 100; //应该是0.01？
                $el.find(`.bachar-stats-CriticalDamageRate .bachar-stats-value`).text(`${statCriticalRate}\%`);
            }else $el.find(`.bachar-stats-${statname} .bachar-stats-value`).text(studentStats.stats[statname][0])
        })
        return;
    }

    $(".bachar-container").each(async (_, ele) => {
        const $ele = $(ele);
        const charName = $ele.data("ba-name")
        if (!charName) {
            console.error("[BACharInfo] No character name found", ele);
            return;
        }
        const character = rawData[charName];
        if (!character) {
            if (!updatedNow) {
                await updateCache(charName);
            } else {
                console.error(`[BACharInfo] Character ${charName} not found`);
                return;
            }
        }
        $ele.data("ba-stats", new CharacterStats(character));
        let studentStats = new CharacterStats(character)

        //初始化基本信息
        /*let imageUrl = "";
        await mw.loader.using(["mediawiki.api", "ext.gadget.LocalObjectStorage"]);
        const api = new mw.Api()
        (
            await api.get({
                "action": "query",
                "prop": "imageinfo",
                "titles": "File:BA_Pic_Star_3.png",
                "iiprop": "url"
            })
        ).query.pages.forEach((key, imageData) => {
            imageUrl = imageData.imageinfo.url;
        });
        console.log(imageUrl);*/
        //var imageHash = md5(`BA_Pic_Star_${character.Rate}\.png`)
        //var starImageUrl = `https://img.moegirl.org.cn\/common\/thumb/${imageHash.slice(0, 1)}/${imageHash.slice(0, 2)}/BA_Pic_Star_${character.Rate}.png`
        /*$ele.find(".bachar-char-star").replaceWith(
            `<span class="bachar-char-star bachar-all-unitalic"><img alt="初始星级为${zhNumbers[character.Rate]}星" src="${starImageUrl}/50px-BA_Pic_Star_${character.Rate}.png" title="初始星级为${zhNumbers[character.Rate]}星" width="50" height="15" srcset="${starImageUrl}" 1.5x" data-file-width="65" data-file-height="20"></span>`
        );*/
        // 临时性 初始化数据
        studentStatList.forEach(statname => {
            $ele.find(`.bachar-stats-${statname} .bachar-stats-value`).text(studentStats.getTotal(statname))
        })
        const api = new mw.Api();
        imageUrl = Object.values((await api.get({
            "action": "query",
            "prop": "imageinfo",
            "titles": "File:BA_Pic_Star_3.png",
            "iiprop": "url"
        })).query.pages)[0].imageinfo.url;
        console.log(imageUrl)

        // Replace slider
        $ele.find(".bachar-char-expbar").replaceWith(
            '<input class="bachar-char-expbar bachar-all-unitalic" oninput="" type="range" min="1" max="83" value="1" step="1" />',
        );
        const $expLv = $ele.find(".bachar-char-explv"),
            $expBar = $ele.find(".bachar-char-expbar");
        mw.util.addCSS(`
        .bachar-char-expbar::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 1em;
            height: 1em;
            border-radius: 50%;
            background: #2d4c72;
            cursor: pointer;
        }

        .bachar-char-expbar::-moz-range-thumb {
            width: 1em;
            height: 1em;
            border-radius: 50%;
            background: #2d4c72;
            cursor: pointer;
        }`);

        $expBar.on("input", () => {
            $expLv.text($expBar.val());
            recalculateStats($ele, $expBar.val(), character)
        }).trigger("input");
    });
});
