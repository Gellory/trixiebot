/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const secureRandom = require("../modules/random/secureRandom");

const SimpleCommand = require("../core/commands/SimpleCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const MessageMentions = require("../util/commands/MessageMentions");

const Paginator = require("../util/commands/Paginator");

module.exports = function install(cr, client, config, db) {
    const database = db.collection("penis");

    const penisCommand = cr.registerCommand("penis", new TreeCommand)
        .setExplicit(true)
        .setHelp(new HelpContent()
            .setDescription("Check on what package your buddy is carrying~ (or you are caring)\nRandomy generated penis size.")
            .setUsage("<?mention>")
            .addParameterOptional("mention", "User who's penis you wish to ~~pleasure~~ measure"))
        .setCategory(Category.ACTION);

    /**
     * SUB COMMANDS
     */

    penisCommand.registerDefaultCommand(new SimpleCommand(async (message, content) => {
        const uom = message.guild.config.uom;
        const r = uom === "cm" ? 2.54 : 1;

        const mentions = new MessageMentions(content, message.guild);

        const member = mentions.members.first() || message.member;

        if (mentions.everyone) {
            await message.channel.sendTranslated("everyone has fucking huge diccs k. You're all beautiful");
            return;
        }

        if (member.user.id === client.user.id) {
            const length = 20;
            const girth = 18;
            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D ( ͡° ͜ʖ ͡°)\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
            return;
        }

        const doc = await database.findOne({ userId: member.user.id });
        if (!doc) {
            const random = await secureRandom() - 0.2;
            const length = (Math.pow((random > 0 ?
                ((Math.pow(random, 1.4) + 0.2) * 15) + 3 :
                ((random + 0.2) * 15) + 3) / 20, 1.4) * 20) + 1.5;
            const girth = (Math.pow((await secureRandom() + ((random - 0.1) * 2)) * 0.3, 2) * 8) + 6;

            await database.insertOne({
                userId: member.user.id,
                girth,
                length,
            });

            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
        } else {
            const { length, girth } = doc;

            await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\n${await message.channel.translate("Length:")} **${(length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(girth * r).toFixed(1)} ${uom}**`);
        }
    }));

    penisCommand.registerSubCommand("leaderboard", new SimpleCommand(async message => {
        const uom = message.guild.config.uom;
        const r = uom === "cm" ? 2.54 : 1;

        await message.guild.fetchMembers();
        const penises = await database.find({ $or: message.guild.members.array().map(member => ({ userId: member.user.id })) }).toArray();
        const sorted = penises.sort((a, b) => b.length - a.length);

        const items = [];
        for (let penis of sorted) {
            const member = message.guild.members.get(penis.userId);
            if (!member) continue;
            items.push(
                `**8${new Array(Math.round(penis.length)).fill("=").join("")}D   ${member.user.tag}**\n` +
                `${await message.channel.translate("Length:")} **${(penis.length * r).toFixed(1)} ${uom}**   ${await message.channel.translate("Girth:")} **${(penis.girth * r).toFixed(1)} ${uom}**`
            );
        }

        new Paginator("Penis Leaderboard", "The top penises in this server", 20, items, message.author, { number_items: true, guild: message.guild }).display(message.channel);
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Shows where you are in the penis size ranking"));

    cr.registerAlias("penis", "cock");
    cr.registerAlias("penis", "dick");
};
