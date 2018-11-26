const TreeCommand = require("../../class/TreeCommand");
const AliasCommand = require("../../class/AliasCommand");
const CommandPermission = require("../../logic/commands/CommandPermission");
const { RichEmbed, Permissions } = require("discord.js");
const CONST = require("../../modules/CONST");

const { FLAGS } = Permissions;

function ucFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function format(message, format = {}) {
    for (const f in format) {
        // eslint-disable-next-line no-useless-escape
        message = message.replace(new RegExp(`{{\s*${f}\s*}}`, "g"), format[f]);
    }
    return message;
}

class HelpBuilder extends RichEmbed {
    constructor(message, name, command) {
        super();

        const help = command.help;

        this.setColor(CONST.COLOR.PRIMARY);
        this.setAuthor(`${ucFirst(name)} command`, message.client.user.avatarURL);
        if (help.description) this.setDescription(help.description);

        const prefix = message.guild.config.prefix;

        if (command.permissions && command.permissions !== CommandPermission.USER)
            this.addField("Permissions required:", command.permissions.toString());

        if (command.rateLimiter)
            this.addField("Rate Limiting:", command.rateLimiter.toString());

        let fields = [{ usage: "", title: "" }];
        let i = 0;

        const func = (name, command, parentName) => {
            const help = command.help;
            let field = fields[i];

            if (help) {
                if (help.title) {
                    fields.push({ usage: "", title: help.title.charAt(help.title.length - 1) === ":" ? help.title : help.title + ":" });
                    i++;
                    field = fields[i];
                }
                    
                if (help.options === "" && help.usage)
                    field.usage += `\`${prefix}${name}\` - ${help.usage}`;
                else if (help.options && help.usage)
                    field.usage += `\`${prefix}${name}${" " + help.options}\` - ${help.usage}`;
                else if (help.options === "" && !help.usage)
                    field.usage += `\`${prefix}${name}\``;
                else if (help.options && !help.usage)
                    field.usage += `\`${prefix}${name}${" " + help.options}\``;
                else if (!help.options && help.usage)
                    field.usage += help.usage;
                else if (!help.options && !help.usage)
                    field.usage += `\`${prefix}${name}\``;

                let aliases = [...command.aliases.map(v => {
                    if (v !== "*") return v;
                    else return parentName;
                })];
                if (command instanceof TreeCommand && command.sub_commands.has("*")) {
                    aliases = [...aliases, ...command.sub_commands.get("*").aliases.map(v => name + " " + v)];
                }

                if (aliases.length > 0)
                    field.usage += ` *(alias ${aliases.map(a => `\`${prefix}${a}\``).join(", ")})*`;

                if (help.parameters.size > 0) {
                    for (const [name, parameter] of help.parameters) {
                        field.usage += "\n" + this.createParameter(name, parameter);
                    }
                }
            }

            if (command instanceof TreeCommand) {
                for (const [sub_cmd_name, sub_command] of command.sub_commands) {
                    if (sub_command instanceof AliasCommand) continue;
                    if (sub_cmd_name === "*") continue;

                    const sub_name = name + " " + sub_cmd_name;
                    
                    field.usage += "\n\n";

                    func(sub_name, sub_command, name);
                }
            }
        };
        func(name, command);

        for (let { title, usage } of fields) {
            usage = usage.replace(/\n{2,}/g, "\n\n");

            if (usage !== "") this.addField(title || "Usage:", format(usage, { prefix }));
        }

        if (command.category) this.setFooter(`Category: ${command.category.toString()}`);
    }

    createParameter(name, parameter) {
        return `\`${name}\` ${parameter.optional ? "- optional" : ""}- ${parameter.content}`;
    }
}

HelpBuilder.sendHelp = async function sendHelp(message, name, command) {
    if (command instanceof AliasCommand) {
        command = command.command;
    }

    if (!command.help) return;

    const embed = new HelpBuilder(message, name, command);
    return await message.channel.send({ embed });
};

module.exports = HelpBuilder;