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

const asciiPromise = require("asciify-image");
const filetype = require("file-type");
const request = require("request");
const HelpBuilder = require("../util/commands/HelpBuilder");

const options = {
    fit: "box",
    width: 31,
    height: 32,
    color: false,
};

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

module.exports = function install(cr) {
    const ascii_cmd = new SimpleCommand(async (message, content, { command_name }) => {
        const urls = [];
        const match = content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g);
        urls.push(...(match || []));
        for (const a of message.attachments.array()) {
            urls.push(a.url);
        }

        if (urls.length === 0) {
            await HelpBuilder.sendHelp(message, command_name, ascii_cmd);
            return;
        }

        await new Promise((resolve, reject) => {
            const req = request(urls[0], { timeout: 5000, encoding: null }, (err, res, body) => {
                if (err) return reject(new Error("Couldn't download the image"));

                const type = filetype(body);

                if (!/jpg|png|gif/.test(type.ext)) {
                    return reject(new Error("The image must be JPG, PNG or GIF"));
                }

                asciiPromise(body, options, (err, ascii) => {
                    if (err) return reject(new Error("Soooooooooooooooooooooooooomething went wrong"));

                    resolve("```\n" + ascii + "\n```");
                });
            });

            req.on("error", () => {
                req.destroy();
                return reject(new Error("Request failed"));
            });
            req.on("response", res => {
                if (res.statusCode !== 200) {
                    res.destroy();
                    return reject(new Error("Request failed"));
                }

                const header = res.headers["content-type"].split("/")[1];
                if (!header || !/jpg|jpeg|png|gif/.test(header)) {
                    res.destroy();
                    return reject(new Error("The image must be JPG, PNG or GIF"));
                }
            });
        }).then(body =>
            message.channel.send(body)
        ).catch(err =>
            message.channel.send(err.message)
        );
    });

    cr.registerCommand("ascii", ascii_cmd)
        .setHelp(new HelpContent()
            .setDescription("Generates ascii art from an image")
            .setUsage("<?url>")
            .addParameterOptional("url", "Url to an image. Or add an attachment to your message"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
};
