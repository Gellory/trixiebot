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

const { default: fetch, Response: FetchResponse } = require("node-fetch");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;
const CommandScope = require("../util/commands/CommandScope").default;

module.exports = function install(cr) {
    cr.registerCommand(
        "catfact",
        new SimpleCommand(async () => {
            /** @type {FetchResponse} */
            const request = await fetch("https://cat-fact.herokuapp.com/facts/random");
            const magic = await request.json();
            if (!magic) {
                throw new Error("API fucked up");
            }

            return magic.text;
        })
    )
        .setHelp(new HelpContent().setUsage("", "Get you a cat fact that will help you raise your babies better <3"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
};
