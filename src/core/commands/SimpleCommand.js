/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const BaseCommand = require("./BaseCommand").default;

// eslint-disable-next-line no-unused-vars
const MessageContext = require("../../util/commands/MessageContext").default;

class SimpleCommand extends BaseCommand {
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {(message: MessageContext, command_name: string) => *} func
     */
    constructor(func) {
        super();

        this.func = func;
    }

    async run(context, command_name) {
        const result = await this.func(context, command_name);
        if (!result) return;

        // allow returning a [content, opts] like array
        if (Array.isArray(result)) await context.send(...result);
        else await context.send(result);
    }
}

module.exports = SimpleCommand;
