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

const { userToString } = require("../../util/util");
const BaseCommand = require("./BaseCommand");
const secureRandom = require("../../modules/random/secureRandom");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const MessageMentions = require("../../util/commands/MessageMentions");

const TranslationFormatter = require("../../modules/i18n/TranslationFormatter");
const Translation = require("../../modules/i18n/Translation");

class TextActionCommand extends BaseCommand {
    constructor(description, content, noMentionMessage, permissions) {
        super(permissions);

        this.setHelp(new HelpContent()
            .setDescription(description)
            .setUsage("<@user>"));
        this.setCategory(Category.ACTION);

        this.texts = content instanceof Array ? content : [content];
        this.noMentionMessage = noMentionMessage;
        this.everyone = false;
    }

    async run(context) {
        const mentions = new MessageMentions(context.content, context.guild);
        const mention = mentions.members.first();
        if (!mention && !mentions.everyone) {
            await context.send(this.noMentionMessage);
            return;
        }

        const phrase = await secureRandom(this.texts);

        if (mentions.everyone) {
            await context.send(new TranslationFormatter(phrase, { user: new Translation("textaction.everyone", "all {{count}} users", { count: context.guild.members.size }) }));
        } else {
            await context.send(new TranslationFormatter(phrase, { user: userToString(mention) }));
        }
    }

    setAllowEveryone(v) {
        this.everyone = v;
        return this;
    }
}

module.exports = TextActionCommand;
