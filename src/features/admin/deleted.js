const { userToString } = require("../../modules/util");

const SimpleCommand = require("../../class/SimpleCommand");
const TreeCommand = require("../../class/TreeCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const CommandPermission = require("../../logic/commands/CommandPermission");
const Category = require("../../logic/commands/Category");

const Paginator = require("../../logic/Paginator");

module.exports = async function install(cr, client, config, db) {
    const database = db.collection("deleted_messages");
    database.createIndex("deletedAt", { expireAfterSeconds: 7 * 24 * 3600 });
    database.createIndex("editedAt", { expireAfterSeconds: 3 * 24 * 3600 });
    database.createIndex({ messageId: 1 }, { unique: true });

    client.on("messageDelete", async message => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.content === "") return;
        if (message.channel.type !== "text") return;

        await database.updateOne({
            messageId: message.id,
        }, {
            $set: {
                guildId: message.guild.id,
                channelId: message.channel.id,
                userId: message.author.id,
                name: message.author.tag,
                attachments: message.attachments.array().map(a => ({ url: a.url, size: a.filesize, isImg: a.width && a.height })),
                createdAt: message.createdAt,
                deletedAt: new Date
            },
            $push: {
                edits: {
                    content: message.content,
                    editedAt: message.editedAt || message.createdAt
                }
            },
            $unset: {
                editedAt: 1
            }
        }, { upsert: true });
    });

    client.on("messageUpdate", async (message, new_message) => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (message.channel.type !== "text") return;

        await database.updateOne({
            messageId: message.id,
        }, {
            $set: {
                guildId: message.guild.id,
                channelId: message.channel.id,
                userId: message.author.id,
                name: message.author.tag,
                attachments: message.attachments.array().map(a => ({ url: a.url, size: a.filesize, isImg: a.width && a.height })),
                createdAt: message.createdAt,
                editedAt: new_message.editedAt
            },
            $push: {
                edits: {
                    content: message.content,
                    editedAt: message.editedAt || message.createdAt
                }
            }
        }, { upsert: true });
    });

    // Registering down here

    const deletedCommand = cr.register("deleted", new class extends TreeCommand {
        async noPermission(message) {
            await message.channel.sendTranslated("No boi, git gud");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Trixie can collect deleted for up to 7 days, so you always know what's going on in your server behind your back.\nCommand enabled by default. Soon option to turn it off")
            .setUsage("", "List all deleted messages from the last 7 days"))
        .setCategory(Category.MODERATION)
        .setPermissions(CommandPermission.ADMIN);
    
    deletedCommand.registerSubCommand("clear", new SimpleCommand(async message => {
        await database.deleteMany({ guildId: message.guild.id });

        await message.channel.sendTranslated("Removed all deleted messages successfully");
    }))
        .setHelp(new HelpContent()
            .setUsage("", "Clears list of deleted messages"));

    deletedCommand.registerDefaultCommand(new SimpleCommand(async message => {
        const messages = await database.find({
            guildId: message.guild.id
        }).toArray();

        if (messages.length === 0) {
            await message.channel.sendTranslated("Yeeeeah, nothing found");
            return;
        }

        const page_limit = 10;
        
        const items = [];
        for (const deleted_message of messages.filter(m => "deletedAt" in m).sort((a, b) => b.deletedAt - a.deletedAt)) {
            let str = "";
            const channel = message.guild.channels.get(deleted_message.channelId);
            if (channel) str += `# **${channel.name}**`;
            else str += "# **deleted channel**";

            const timestamp = deleted_message.deletedAt.toLocaleString().slice(0, -3);
            str += ` | ${timestamp} | `;

            const member = message.client.users.get(deleted_message.userId);
            if (member) str += `${userToString(member)}: `;
            else str += `**${deleted_message.name}**: `;

            str += "\n";
            str += `\`${deleted_message.edits[deleted_message.edits.length - 1].content.replace(/`/g, "´")}\``;
            items.push(str);
        }

        new Paginator("Deleted Messages", `Messages deleted or edited by users: **${items.length}**\n`, page_limit, items, message.author, { guild: message.guild }).display(message.channel);
    }));
};