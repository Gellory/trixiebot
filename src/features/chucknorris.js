const fetch = require("node-fetch");
const HTMLDecoderEncoder = require("html-encoder-decoder");

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("chucknorris", new SimpleCommand(async () => {
        /** @type {} */
        const request = await fetch("https://api.chucknorris.io/jokes/random");
        const magic = await request.json();
        if (!magic) {
            throw new Error("API fucked up");
        }

        return HTMLDecoderEncoder.decode(magic.value);
    }))
        .setHelp(new HelpContent()
            .setDescription("Chuck\nNorris\nFacts!!!"))
        .setCategory(Category.MISC);
};