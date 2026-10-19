// Fails when the React Compiler skips a component or a hook. The build never says so: the compiler's Babel plugin
// reports a function it cannot compile to a logger that Vite does not set, and the function ships as written.
//   node scripts/check-compiler.mjs [directory]     (npm run check does, on resources/js)
//
// It runs the compiler the way the build does (vite.config.ts: reactCompilerPreset() through @rolldown/plugin-babel):
// the TypeScript source as it is, the parser plugins that plugin sets, the compiler's default options. Keep them in
// step. A skip that is meant is written in the function: `'use no memo';` as its first statement, the reason above it.
import * as babel from '@babel/core';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const compiler = fileURLToPath(
    import.meta.resolve('babel-plugin-react-compiler'),
);
const root = process.argv[2] ?? 'resources/js';
// Written by Wayfinder and the type transformer; there is no component in them.
const generated = /^(actions|routes|wayfinder|generated)\//;
const optOut = /^use no (memo|forget)$/;

// @babel/core 8 took AssignmentPattern out of the LVal alias that compiler 1.0 asks for, so it skips every function
// whose props are destructured with a default (`{ label = 'Try again' }`): https://github.com/react/react/pull/36956.
// Those are listed but do not fail the check. Delete this when @babel/core is pinned to 7 or the compiler has the fix.
const babel8 =
    /Expected object property value to be an LVal, got: AssignmentPattern/;

const skipped = new Map();
const knownBug = new Map();
let compiled = 0;

for (const file of readdirSync(root, { recursive: true }).sort()) {
    if (
        !/\.tsx?$/.test(file) ||
        file.endsWith('.d.ts') ||
        generated.test(file)
    ) {
        continue;
    }

    const path = join(root, file);
    const code = readFileSync(path, 'utf8');
    const events = [];
    const optedOut = new Set();

    await babel.transformAsync(code, {
        filename: path,
        babelrc: false,
        configFile: false,
        code: false,
        parserOpts: {
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            plugins: file.endsWith('x')
                ? ['typescript', 'jsx']
                : ['typescript'],
        },
        plugins: [
            [
                compiler,
                { logger: { logEvent: (_file, event) => events.push(event) } },
            ],
            () => ({
                visitor: {
                    Function(fn) {
                        const directives = fn.node.body.directives ?? [];

                        if (
                            directives.some((d) => optOut.test(d.value.value))
                        ) {
                            const { line, column } = fn.node.loc.start;
                            optedOut.add(`${line}:${column}`);
                        }
                    },
                },
            }),
        ],
    });

    for (const event of events) {
        if (event.kind === 'CompileSuccess') {
            compiled++;
        }

        if (event.kind !== 'CompileError' && event.kind !== 'PipelineError') {
            continue;
        }

        // An error about the whole file has no function.
        const start = event.fnLoc?.start;

        if (start && optedOut.has(`${start.line}:${start.column}`)) {
            continue;
        }

        const line = start?.line ?? 1;
        const where = `${path}:${line}`;
        const reason =
            event.kind === 'CompileError'
                ? (event.detail?.reason ?? 'no reason given')
                : event.data.split('\n')[0];
        const list = babel8.test(reason) ? knownBug : skipped;

        // One function can have several errors; the first is enough.
        if (!list.has(where)) {
            list.set(where, {
                source: code.split('\n')[line - 1].trim(),
                reason,
            });
        }
    }
}

if (knownBug.size > 0) {
    console.warn(
        'Not compiled, known: @babel/core 8 and compiler 1.0 disagree about default values in destructuring (react/react#36956). With @babel/core 7 the compiler sees them again:',
    );

    for (const [where, { source }] of knownBug) {
        console.warn(`  ${where}  ${source}`);
    }
}

if (compiled === 0) {
    skipped.set(root, {
        source: '',
        reason: 'No function was compiled at all, so nothing was checked.',
    });
}

if (skipped.size > 0) {
    console.error(
        "\nThe React Compiler skipped functions it is meant to compile. Make them compile, or write 'use no memo'; as the first statement with the reason above it:",
    );

    for (const [where, { source, reason }] of skipped) {
        console.error(`  ${where}  ${source}\n      ${reason}`);
    }

    process.exit(1);
}

console.log(
    `React Compiler: ${compiled} compiled${knownBug.size > 0 ? `, ${knownBug.size} skipped for the known reason above` : ''}, none skipped without a reason.`,
);
