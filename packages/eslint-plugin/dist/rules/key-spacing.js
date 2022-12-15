"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util = __importStar(require("../util"));
const getESLintCoreRule_1 = require("../util/getESLintCoreRule");
const baseRule = (0, getESLintCoreRule_1.getESLintCoreRule)('key-spacing');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const baseSchema = Array.isArray(baseRule.meta.schema)
    ? baseRule.meta.schema[0]
    : baseRule.meta.schema;
exports.default = util.createRule({
    name: 'key-spacing',
    meta: {
        type: 'layout',
        docs: {
            description: 'Enforce consistent spacing between keys and values in types and interfaces',
            recommended: false,
            extendsBaseRule: true,
        },
        fixable: 'whitespace',
        hasSuggestions: baseRule.meta.hasSuggestions,
        schema: [baseSchema],
        messages: baseRule.meta.messages,
    },
    defaultOptions: [{}],
    create(context, [options]) {
        const sourceCode = context.getSourceCode();
        const baseRules = baseRule.create(context);
        /**
         * Starting from the given a node (a property.key node here) looks forward
         * until it finds the last token before a colon punctuator and returns it.
         */
        function getLastTokenBeforeColon(node) {
            const colonToken = sourceCode.getTokenAfter(node, util.isColonToken);
            return sourceCode.getTokenBefore(colonToken);
        }
        function isKeyTypeNode(node) {
            return ((node.type === utils_1.AST_NODE_TYPES.TSPropertySignature ||
                node.type === utils_1.AST_NODE_TYPES.TSIndexSignature ||
                node.type === utils_1.AST_NODE_TYPES.PropertyDefinition) &&
                !!node.typeAnnotation);
        }
        /**
         * To handle index signatures, to get the whole text for the parameters
         */
        function getKeyText(node) {
            if ('key' in node) {
                return sourceCode.getText(node.key);
            }
            const code = sourceCode.getText(node);
            return code.slice(0, sourceCode.getTokenAfter(node.parameters.at(-1), util.isClosingBracketToken).range[1] - node.range[0]);
        }
        /**
         * To handle index signatures, be able to get the end position of the parameters
         */
        function getKeyLocEnd(node) {
            return getLastTokenBeforeColon('key' in node ? node.key : node.parameters.at(-1)).loc.end;
        }
        function checkBeforeColon(node, nBeforeColon, mode) {
            const colon = node.typeAnnotation.loc.start.column;
            const keyEnd = getKeyLocEnd(node);
            const difference = colon - keyEnd.column - nBeforeColon;
            if (mode === 'strict' ? difference : difference < 0) {
                context.report({
                    node,
                    messageId: difference > 0 ? 'extraKey' : 'missingKey',
                    fix: fixer => {
                        if (difference > 0) {
                            return fixer.removeRange([
                                node.typeAnnotation.range[0] - difference,
                                node.typeAnnotation.range[0],
                            ]);
                        }
                        else {
                            return fixer.insertTextBefore(node.typeAnnotation, ' '.repeat(-difference));
                        }
                    },
                    data: {
                        computed: '',
                        key: getKeyText(node),
                    },
                });
            }
        }
        function checkAfterColon(node, nAfterColon, mode) {
            const colon = node.typeAnnotation.loc.start.column;
            const typeStart = node.typeAnnotation.typeAnnotation.loc.start.column;
            const difference = typeStart - colon - 1 - nAfterColon;
            if (mode === 'strict' ? difference : difference < 0) {
                context.report({
                    node,
                    messageId: difference > 0 ? 'extraValue' : 'missingValue',
                    fix: fixer => {
                        if (difference > 0) {
                            return fixer.removeRange([
                                node.typeAnnotation.typeAnnotation.range[0] - difference,
                                node.typeAnnotation.typeAnnotation.range[0],
                            ]);
                        }
                        else {
                            return fixer.insertTextBefore(node.typeAnnotation.typeAnnotation, ' '.repeat(-difference));
                        }
                    },
                    data: {
                        computed: '',
                        key: getKeyText(node),
                    },
                });
            }
        }
        // adapted from  https://github.com/eslint/eslint/blob/ba74253e8bd63e9e163bbee0540031be77e39253/lib/rules/key-spacing.js#L356
        function continuesAlignGroup(lastMember, candidate) {
            const groupEndLine = lastMember.loc.start.line;
            const candidateValueStartLine = (isKeyTypeNode(candidate) ? candidate.typeAnnotation : candidate).loc.start.line;
            if (candidateValueStartLine === groupEndLine) {
                return false;
            }
            if (candidateValueStartLine - groupEndLine === 1) {
                return true;
            }
            /*
             * Check that the first comment is adjacent to the end of the group, the
             * last comment is adjacent to the candidate property, and that successive
             * comments are adjacent to each other.
             */
            const leadingComments = sourceCode.getCommentsBefore(candidate);
            if (leadingComments.length &&
                leadingComments[0].loc.start.line - groupEndLine <= 1 &&
                candidateValueStartLine - leadingComments.at(-1).loc.end.line <= 1) {
                for (let i = 1; i < leadingComments.length; i++) {
                    if (leadingComments[i].loc.start.line -
                        leadingComments[i - 1].loc.end.line >
                        1) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        function checkAlignGroup(group) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            let alignColumn = 0;
            const align = (_d = (typeof options.align === 'object'
                ? options.align.on
                : typeof ((_a = options.multiLine) === null || _a === void 0 ? void 0 : _a.align) === 'object'
                    ? options.multiLine.align.on
                    : (_c = (_b = options.multiLine) === null || _b === void 0 ? void 0 : _b.align) !== null && _c !== void 0 ? _c : options.align)) !== null && _d !== void 0 ? _d : 'colon';
            const beforeColon = (_e = (typeof options.align === 'object'
                ? options.align.beforeColon
                : options.multiLine
                    ? typeof options.multiLine.align === 'object'
                        ? options.multiLine.align.beforeColon
                        : options.multiLine.beforeColon
                    : options.beforeColon)) !== null && _e !== void 0 ? _e : false;
            const nBeforeColon = beforeColon ? 1 : 0;
            const afterColon = (_f = (typeof options.align === 'object'
                ? options.align.afterColon
                : options.multiLine
                    ? typeof options.multiLine.align === 'object'
                        ? options.multiLine.align.afterColon
                        : options.multiLine.afterColon
                    : options.afterColon)) !== null && _f !== void 0 ? _f : true;
            const nAfterColon = afterColon ? 1 : 0;
            const mode = (_h = (typeof options.align === 'object'
                ? options.align.mode
                : options.multiLine
                    ? typeof options.multiLine.align === 'object'
                        ? // same behavior as in original rule
                            (_g = options.multiLine.align.mode) !== null && _g !== void 0 ? _g : options.multiLine.mode
                        : options.multiLine.mode
                    : options.mode)) !== null && _h !== void 0 ? _h : 'strict';
            for (const node of group) {
                if (isKeyTypeNode(node)) {
                    alignColumn = Math.max(alignColumn, align === 'colon'
                        ? getKeyLocEnd(node).column + nBeforeColon
                        : node.typeAnnotation.loc.start.column +
                            ':'.length +
                            nAfterColon +
                            nBeforeColon);
                }
            }
            for (const node of group) {
                if (!isKeyTypeNode(node)) {
                    continue;
                }
                const toCheck = align === 'colon'
                    ? node.typeAnnotation
                    : node.typeAnnotation.typeAnnotation;
                const difference = toCheck.loc.start.column - alignColumn;
                if (difference) {
                    context.report({
                        node,
                        messageId: difference > 0
                            ? align === 'colon'
                                ? 'extraKey'
                                : 'extraValue'
                            : align === 'colon'
                                ? 'missingKey'
                                : 'missingValue',
                        fix: fixer => {
                            if (difference > 0) {
                                return fixer.removeRange([
                                    toCheck.range[0] - difference,
                                    toCheck.range[0],
                                ]);
                            }
                            else {
                                return fixer.insertTextBefore(toCheck, ' '.repeat(-difference));
                            }
                        },
                        data: {
                            computed: '',
                            key: getKeyText(node),
                        },
                    });
                }
                if (align === 'colon') {
                    checkAfterColon(node, nAfterColon, mode);
                }
                else {
                    checkBeforeColon(node, nBeforeColon, mode);
                }
            }
        }
        function checkIndividualNode(node, { singleLine }) {
            var _a, _b, _c;
            const beforeColon = (_a = (singleLine
                ? options.singleLine
                    ? options.singleLine.beforeColon
                    : options.beforeColon
                : options.multiLine
                    ? options.multiLine.beforeColon
                    : options.beforeColon)) !== null && _a !== void 0 ? _a : false;
            const nBeforeColon = beforeColon ? 1 : 0;
            const afterColon = (_b = (singleLine
                ? options.singleLine
                    ? options.singleLine.afterColon
                    : options.afterColon
                : options.multiLine
                    ? options.multiLine.afterColon
                    : options.afterColon)) !== null && _b !== void 0 ? _b : true;
            const nAfterColon = afterColon ? 1 : 0;
            const mode = (_c = (singleLine
                ? options.singleLine
                    ? options.singleLine.mode
                    : options.mode
                : options.multiLine
                    ? options.multiLine.mode
                    : options.mode)) !== null && _c !== void 0 ? _c : 'strict';
            if (isKeyTypeNode(node)) {
                checkBeforeColon(node, nBeforeColon, mode);
                checkAfterColon(node, nAfterColon, mode);
            }
        }
        function validateBody(body) {
            var _a;
            const isSingleLine = body.loc.start.line === body.loc.end.line;
            const members = 'members' in body ? body.members : body.body;
            let alignGroups = [];
            let unalignedElements = [];
            if (options.align || ((_a = options.multiLine) === null || _a === void 0 ? void 0 : _a.align)) {
                let currentAlignGroup = [];
                alignGroups.push(currentAlignGroup);
                for (const node of members) {
                    const prevNode = currentAlignGroup.at(-1);
                    if (prevNode && continuesAlignGroup(prevNode, node)) {
                        currentAlignGroup.push(node);
                    }
                    else if ((prevNode === null || prevNode === void 0 ? void 0 : prevNode.loc.start.line) === node.loc.start.line) {
                        if (currentAlignGroup.length) {
                            unalignedElements.push(currentAlignGroup.pop());
                        }
                        unalignedElements.push(node);
                    }
                    else {
                        currentAlignGroup = [node];
                        alignGroups.push(currentAlignGroup);
                    }
                }
                unalignedElements.push(...alignGroups
                    .filter(group => group.length === 1)
                    .flatMap(group => group));
                alignGroups = alignGroups.filter(group => group.length >= 2);
            }
            else {
                unalignedElements = members;
            }
            for (const group of alignGroups) {
                checkAlignGroup(group);
            }
            for (const node of unalignedElements) {
                checkIndividualNode(node, { singleLine: isSingleLine });
            }
        }
        return Object.assign(Object.assign({}, baseRules), { TSTypeLiteral: validateBody, TSInterfaceBody: validateBody, ClassBody: validateBody });
    },
});
//# sourceMappingURL=key-spacing.js.map