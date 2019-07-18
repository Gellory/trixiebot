const log = require("../modules/log").namespace("vc cmds");
const AudioManager = require("../logic/managers/AudioManager");
const { ConnectError } = AudioManager;

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.registerCommand("leavevc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.destroy();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.namespace("leave", err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Make Trixie leave the voice channel!"))
        .setCategory(Category.AUDIO);
    
    cr.registerAlias("leavevc", "leave");
    cr.registerAlias("leavevc", "begone");

    cr.registerCommand("stopvc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.stop();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.namespace("stop", err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);
    
    cr.registerAlias("stopvc", "stop");

    cr.registerCommand("joinvc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.connect(message.member);
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            if (err instanceof ConnectError) {
                message.channel.sendTranslated(err.message);
                return;
            }
            log.namespace("join", err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);
        
    cr.registerAlias("joinvc", "join");
};