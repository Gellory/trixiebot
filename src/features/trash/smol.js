const log = require("../../modules/log");
const tinytext = require("tiny-text");
const Command = require("../../class/Command");

class SmolCommand extends Command {
    async onmessage(message) {
        if (/^!smol\b/i.test(message.content)) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = message.content.replace(/\s+/g, " ");
                const tmp = text.substr(6);
                if (tmp === "") {
                    await message.channel.send("Usage: `!smol <string|user>`");
                    log("Sent smol usage");
                    return;
                }
                await message.channel.send(tinytext(tmp));
                log(`Smoled ${tmp}`);
                return;
            }
            await message.channel.send(tinytext(mention.displayName));
            log(`Smoled ${mention.user.username}`);
            return;
        }
    }
    get usage() {
        return `\`!smol <string|user>\`
\`string|user\` - text or user to smollerize uwu`;
    }
}

module.exports = SmolCommand;