const log = require("../modules/log");
const Discord = require("discord.js");
const Command = require("../modules/Command");

const available_roles = {
    "Artist Stuff": [
        "artist",
        "Commissions Open"
    ],
    "Conventions/Meetups": [
        "GalaCon 2018",
        "DerpyFest 2018"
    ]
};

let roles_message = "";
for (let category in available_roles) {
    roles_message += `__**${category}**__\n`;
    roles_message += "```\n";
    for (let role of available_roles[category])
        roles_message += `${role}\n`;
    roles_message += "```\n";
}

const roles_array = {};
for (let category in available_roles)
    for (let role of available_roles[category])
        roles_array[role.toLowerCase()] = role;

const command = new Command(async function onmessage(message) {
    if (/^!role remove\b/.test(message.content)) {
        const role = message.content.trim().split(/ +/g).join(" ").substr(13);
        if (role === "") {
            message.channel.send(this.usage);
            return;
        }

        const members = message.mentions.members.array();
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Remove-Role-From-Somebody-Else. To use the role command you must have permissions to manage roles.");
            return;
        }
        if (members.length > 0) {

            let role2 = role;

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                    message.channel.send("You cannot add roles to other users with Manage Roles permission.");
                    return;
                }
                role2 = role2.replace(member.toString(), "");
            }
            role2 = role2.trim();

            const role_obj = message.guild.roles.find("name", role2);
            if (!role_obj) {
                message.channel.send("Uh apparently this server doesn't have this role available right now.");
                return;
            }

            for (const member of members) {
                member.removeRole(role_obj);
            }
            message.channel.send("Role removed.");
            log(`Removed role ${role2} from users ${members.map(member => member.toString()).join(" ")}`);
        } else {
            const role2 = permission ? role : roles_array[role.toLowerCase()];
            if (!role2) {
                message.channel.send("Hmm... I couldn't really find your role. Check that again");
                return;
            }

            const role_obj = message.guild.roles.find("name", role2);
            if (!role_obj) {
                message.channel.send("Uh apparently this server doesn't have this role available right now.");
                return;
            }

            if (!message.member.roles.has(role_obj.id)) {
                message.channel.send("Can't remove a role without having it first.");
                return;
            }

            await message.member.removeRole(role_obj);
            message.channel.send("Role removed.");
            log(`Removed role ${role2} from user ${message.member.user.username}`);
        }
    }
    else if (/^!role\b/.test(message.content)) {
        const role = message.content.trim().split(/ +/g).join(" ").substr(6);
        if (role === "") {
            message.channel.send(this.usage);
            return;
        }

        const members = message.mentions.members.array();
        const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
        if (!permission) {
            message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Add-Role-To-Somebody-Else. To use the role command you must have permissions to manage roles.");
            return;
        }
        if (members.length > 0) {
            const permission = message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.MANAGE_ROLES);
            if (!permission) {
                message.channel.send("IDK what you're doing here, Mister Not-Allowed-To-Add-Role-To-Somebody-Else. To use the role command you must have permissions to manage roles.");
                return;
            }

            let role2 = role;

            for (const member of members) {
                if (message.channel.permissionsFor(member).has(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
                    message.channel.send("You cannot add roles to other users with Manage Roles permission.");
                    return;
                }
                role2 = role2.replace(member.toString(), "");
            }
            role2 = role2.trim();

            const role_obj = message.guild.roles.find("name", role2);
            if (!role_obj) {
                message.channel.send("Uh apparently this server doesn't have this role available right now.");
                return;
            }

            for (const member of members) {
                await member.addRole(role_obj);
            }
            message.channel.send("Role added! /)");
            log(`Added role ${role2} to users ${members.map(member => member.toString()).join(" ")}`);
        } else {
            const role2 = permission ? role : roles_array[role.toLowerCase()];
            if (!role2) {
                message.channel.send("Hmm... I couldn't really find your role. Here's a list of available ones:\n" + roles_message);
                return;
            }

            const role_obj = message.guild.roles.find("name", role2);
            if (!role_obj) {
                message.channel.send("Uh apparently this server doesn't have this role available right now.");
                return;
            }

            if (message.member.roles.has(role_obj.id)) {
                message.channel.send("You already have this role! Yay?");
                return;
            }

            await message.member.addRole(role_obj);
            message.channel.send("Role added! /)");
            log(`Added role ${role2} to user ${message.member.displayName}`);
        }
    }
}, {
    usage: `\`!role <role> <?user mention 1> <?user mention 2> ...\` to add
\`role\` - The role you would like to have added
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.

\`!role remove <role> <?user mention 1> <?user mention 2> ...\` to remove
\`role\` - The role you would like to have removed
\`user mention\` - this is irrelevant to you, if you don't have rights to manage roles yourself.`,
    ignore: true
});

module.exports = command;
