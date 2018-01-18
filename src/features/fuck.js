const log = require("../modules/log");
const sql = require("../modules/database");
const db = new sql.Database("./data/fucks.sqlite");
const Command = require("../modules/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

const added_recently = new Array();

const command = new Command(async message => {
    if (/^\!fuck add\b/i.test(message.content)) {
        const text = message.content.substr(10);
        if (text === "") {
            await message.channel.send(this.usage);
            log("Sent fuck add usage");
            return;
        }
        if (added_recently.filter(id => message.author.id === id).length > 5) {
            await message.channel.send("Cool down, bro. I can't let you add so much at once! Come back in an hour or so.");
            log(`Gracefully aborted adding fuck text. User ${message.author.username} reached cooldown`);
            return;
        }
        if (text.length <= 10 || text.length > 256) {
            await message.channel.send("Text must be longer than 10 and shorter than 256 characters.\n\n" + this.usage);
            log("Gracefully aborted adding fuck text. Text too long");
            return;
        }
        if (!/\$\{name\}/g.test(text)) {
            await message.channel.send("You must add \`\${name}\` in the place the username should be set.\n\n" + this.usage);
            log("Gracefully aborted adding fuck text. Missing ${name} in text");
            return;
        }
        if (await db.get(`SELECT * FROM fucks WHERE lowercase = "${text.toLowerCase()}"`)) {
            await message.channel.send("This phrase already exists!");
            log("Gracefully aborted adding fuck text. Text already exists");
            return;
        }
        await db.run("INSERT INTO fucks (text, lowercase, author) VALUES (?, ?, ?)", [text, text.toLowerCase(), message.member.displayName]);
        added_recently.push(message.author.id);
        setTimeout(() => {
            added_recently.splice(added_recently.indexOf(message.author.id));
        }, 1000 * 60 * 60); // 60 minutes

        await message.channel.send("Added!");
        log(`Added fuck phrase: ${text}`);
        return;
    }
    if (/^\!fuck\b/i.test(message.content)) {
        if (message.mentions.members.first()) {
            const mention = message.mentions.members.first();
            const phrases = await db.all("SELECT text, author FROM fucks");
            const phrase = phrases.random();
            const author = phrase.author;
            let text = phrase.text;
            text = text.replace(/\$\{name\}'s/g,
                mention.displayName.toLowerCase().charAt(mention.displayName.length - 1) === "s" ?
                    `${mention.displayName}'` :
                    `${mention.displayName}'s`);
            text = text.replace(/\$\{name\}/g, mention.displayName);
            message.channel.send(`*${text}* (submitted by ${author})`);
            log("Served fuck phrase: " + text);
            return;
        }
        await message.channel.send(this.usage);
        log("Sent fuck usage");
        return;
    }
}, async function init() {
    await db.run("CREATE TABLE IF NOT EXISTS fucks (text TEXT, lowercase TEXT, author TEXT)");
}, {
    usage: `\`!fuck <user>\`
\`user\` - the username of the user to fuck

\`!fuck add <text>\`
\`text\` - the text the bot is supposed to say. It must contain \`\${name}\` in the place the username should be set. E.g.: \`!fuck add rides \${name}'s skin bus into tuna town\``,
    ignore: true
});

module.exports = command;