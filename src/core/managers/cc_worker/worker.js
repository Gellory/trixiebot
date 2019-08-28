const cpc = require("../../../modules/concurrency/cpc")(process);

const lexer = require("./lexer/lexer");
const parser = require("./parser");
const Interpreter = require("./interpreter/Interpreter");
const { ObjectLiteral } = require("./interpreter/types");
const { ParserError, TokenizerError } = require("./errors");

function parseTokenizerErrors(errors) {
    return errors.map(err => new TokenizerError(err));
}
function parseParserErrors(errors) {
    return errors.map(err => new ParserError(err));
}

function compileCC(code) {
    // Tokenize the input
    const lexer_result = lexer.tokenize(code);
    if (lexer_result.errors.length > 0)
        throw parseTokenizerErrors(lexer_result.errors);

    // 2. Parse the Tokens vector.
    parser.input = lexer_result.tokens;
    parser.text_input = code;
    const cst = parser.Program();

    if (parser.errors.length > 0)
        throw parseParserErrors(parser.errors);

    return cst;
}

async function runCC(commandId, code, cst, message, settings) {
    const interpreter = new Interpreter(commandId, message.guild.id, code, settings);

    try {
        // 3. Perform semantics using a CstVisitor.
        // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
        const reply = await interpreter.visit(cst, message);
        if (reply instanceof ObjectLiteral && reply.isEmbed) {
            return { embed: reply.getEmbed() };
        }
        return { content: reply ? reply.native : null };
    } catch (error) {
        return { error };
    }
}

cpc.answer("lint", ({ code }) => {
    try {
        compileCC(code);
        return { errors: [] };
    } catch (errs) {
        return { errors: errs };
    }
});

cpc.answer("compile", payload => {
    const { code } = payload;

    try {
        return { cst: compileCC(code), errors: [] };
    } catch (errs) {
        return { cst: undefined, errors: errs };
    }
});

cpc.answer("run", ({ id, code, cst, message, settings }) => runCC(id, code, cst, message, settings));

cpc.send("ready");
