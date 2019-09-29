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

const CONST = require("../const");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Discord = require("discord.js");

module.exports = function install(cr, client, config, db) {
    const database = db.collection("newsletter");

    cr.registerCommand("subscribe", new SimpleCommand(async message => {
        const userId = message.author.id;

        if (await database.findOne({ userId })) {
            return "Damn, you are already subscribed! • c •'";
        }

        await database.insertOne({ userId });

        return ":sparkles: Subscribed to my newsletter! You'll get important updates right in your DM's! Unsubscribe at any time through `" + message.prefix + "unsubscribe`";
    }))
        .setHelp(new HelpContent().setUsage("", "Subscribe to Trixie's newsletter to receive infos about updates and deprecations."))
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);

    cr.registerCommand("unsubscribe", new SimpleCommand(async message => {
        const userId = message.author.id;

        await database.deleteOne({ userId });

        return ":sweat_drops: Successfully unsubscribed! No more inbox spammin' for you";
    }))
        .setHelp(new HelpContent().setUsage("", "Unsubscribe from Trixie's newsletter."))
        .setCategory(Category.INFO)
        .setScope(CommandScope.ALL);

    cr.registerCommand("newsletter", new SimpleCommand(async (message, msg) => {
        const subscribed = await database.find({}).toArray();

        const embed = new Discord.RichEmbed()
            .setColor(CONST.COLOR.PRIMARY)
            .setAuthor(`TrixieBot Newsletter | ${new Date().toLocaleDateString("en")}`, message.client.user.avatarURL)
            .setDescription(msg)
            .setFooter("Unsubscribe from this newsletter via 'unsubscribe'");

        for (let { userId } of subscribed) {
            try {
                const user = await message.client.fetchUser(userId, false);
                if (!user) continue;
                const channel = await user.createDM();
                channel.send({ embed }).catch(() => { /* Do nothing */ });
            } catch (_) { /* Do nothing */ }
        }

        return `Delivered newsletter to ${subscribed.length} subscribers`;
    }))
        .setCategory(Category.OWNER)
        .setScope(CommandScope.ALL);
};
