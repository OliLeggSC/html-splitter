const splitAt = (str, i) => [str.slice(0, i), str.slice(i)];
const isHtml = (str) => /[<>]/g.test(str);
const isClosingTag = (str) => /[<>]\//g.test(str);
const countElement = (arr, el) =>
  arr.reduce((prev, curr) => (curr === el ? prev + 1 : prev), 0);
const getHtmlElements = (str) => str.match(/<[^>]*>|([^><])+/g);
const getTagNamesRegex = (str) => str.matchAll(/<([\/\w]+)/g);
const removeInString = (str, i1, i2) =>
  str.substring(0, i1) + str.substring(i2, str.length);
const getTagName = (str) => getTagNames(str)[0] ?? "";
const getTagNames = (str) => {
  const reg = getTagNamesRegex(str);
  const results = [];
  let result = reg.next();
  while (!result.done) {
    const res = result.value[1] ?? result.value[2] ?? "";
    results.push({
      name: res.replace(/\//, ""),
      isClosingTag: res.startsWith("/"),
    });
    result = reg.next();
  }
  return results;
};

const cullNonHtml = (htmlStrArr) => htmlStrArr.filter(isHtml);
const cullChildTags = (htmlStrArr) => {
  const mappedHtmlArr = Array(htmlStrArr.length);
  for (let i = 0; i < htmlStrArr.length; i++) {
    mappedHtmlArr[i] = { ...getTagNames(htmlStrArr[i])[0], tag: htmlStrArr[i] };
  }
  const culledArr = [];
  for (const html of mappedHtmlArr) {
    const i = culledArr.findIndex(
      (x) => x?.name === html.name && !x?.isClosingTag && html.isClosingTag
    );
    if (i > -1) {
      culledArr.splice(i, 1);
      continue;
    }
    culledArr.push(html);
  }
  return culledArr.map((x) => x.tag);
};

const calcSplit = (html, index) => {
  const matches = getHtmlElements(html) ?? [];
  let countIndex = 0;
  let countTextualIndex = 0;
  for (let i = 0; i < matches.length; i++) {
    const str = matches[i];
    if (isHtml(str)) {
      countIndex += str.length;
      continue;
    }
    if (countTextualIndex + str.length < index) {
      countTextualIndex += str.length;
      countIndex += str.length;
      continue;
    }
    const [left, right] = splitAt(html, countIndex + index - countTextualIndex);

    // searching for left tags to be added to the right
    const missingRightTags = cullChildTags(
      cullNonHtml(getHtmlElements(left) ?? [])
    );

    // searching for right tags to be added to the left
    const missingLeftTags = cullChildTags(
      cullNonHtml(getHtmlElements(right) ?? [])
    );

    return left + missingLeftTags.join("") + missingRightTags.join("") + right;
  }

  return html;
};

const calcSplit2 = (html, index) => {
  const matches = getHtmlElements(html) ?? [];
  let countIndex = 0;
  let countTextualIndex = 0;
  for (let i = 0; i < matches.length; i++) {
    const str = matches[i];
    if (isHtml(str)) {
      countIndex += str.length;
      continue;
    }
    if (countTextualIndex + str.length < index) {
      countTextualIndex += str.length;
      countIndex += str.length;
      continue;
    }
    const [left, right] = splitAt(html, countIndex + index - countTextualIndex);

    // searching for left tags to be added to the right
    const missingRightTags = cullChildTags(
      cullNonHtml(getHtmlElements(left) ?? [])
    );

    // searching for right tags to be added to the left
    const missingLeftTags = cullChildTags(
      cullNonHtml(getHtmlElements(right) ?? [])
    );

    return { left, missingLeftTags, missingRightTags, right };
  }

  return { left: "", missingLeftTags: [], missingRightTags: [], right: "" };
};

const computeObj = ({ left, missingLeftTags, missingRightTags, right }) =>
  left + missingLeftTags.join("") + missingRightTags.join("") + right;

const calcSplitSelection = (html, i1, i2) => {
  const ans1 = calcSplit2(html, i1);
  const ans2 = calcSplit2(computeObj(ans1), i2);
  const answer = getHtmlElements(computeObj(ans2)) ?? [];
  const mrtStrs = ans1.missingRightTags
    .map((x) => getTagName(x))
    .filter((x) => !x.isClosingTag);
  let start = 0;
  let found = 0;
  let shouldFind = mrtStrs.length * 2;
  for (; start < answer.length; start++) {
    const tag = answer[start];
    if (!isHtml(tag)) continue;
    if (mrtStrs.some((x) => x.name === getTagName(tag).name)) {
      found++;
    }
    if (found >= shouldFind) {
      break;
    }
  }
  const mltStrs = ans2.missingLeftTags
    .map((x) => getTagName(x))
    .filter((x) => x.isClosingTag);
  const newAnswer = answer.slice(start + 1);
  let end = newAnswer.length - 1;
  found = 0;
  shouldFind = mltStrs.length * 2;
  for (; end >= 0; end--) {
    const tag = newAnswer[end];
    if (!isHtml(tag)) continue;
    if (mltStrs.some((x) => x.name === getTagName(tag).name)) {
      found++;
    }
    if (found >= shouldFind) {
      break;
    }
  }

  return newAnswer.slice(0, end).join("");
};

// TESTS
const tests = [
  [
    ['<a href="xyz"><p>This is a link</p></a>', 7],
    '<a href="xyz"><p>This is</p></a><a href="xyz"><p> a link</p></a>',
  ],
  [
    ['<a href="xyz">Test<p>This is a link</p></a>', 8],
    '<a href="xyz">Test<p>This</p></a><a href="xyz"><p> is a link</p></a>',
  ],
  [
    ['<a href="xyz"><p>This is a link</p>Test</a>', 7],
    '<a href="xyz"><p>This is</p></a><a href="xyz"><p> a link</p>Test</a>',
  ],
  [
    ['<a href="xyz"><p>Hello, </p><p>This is a link</p>Test</a>', 11],
    '<a href="xyz"><p>Hello, </p><p>This</p></a><a href="xyz"><p> is a link</p>Test</a>',
  ],
  [
    ['<a href="xyz"><p>Hello world </p><p>This is a link</p>Test</a>', 5],
    '<a href="xyz"><p>Hello</p></a><a href="xyz"><p> world </p><p>This is a link</p>Test</a>',
  ],
];

/// TEST LOGIC
const test = (actual, expected, params) =>
  console.log(assertTest(actual, expected, params));
const assertTest = (actual, expected, params) => {
  if (typeof expected === "object") {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    return actualStr === expectedStr
      ? `✅ PASSED: '${!!params ? params : actualStr}'`
      : `❌ FAILED: ${
          !!params ? params : ""
        }\n\tGot: '${actualStr}'\nExpected:\n\t'${expectedStr}'`;
  }
  return actual === expected
    ? `✅ PASSED: '${actual}'`
    : `❌ FAILED: '${
        !!params ? params : ""
      }'\n\tGot:\t  '${actual}'\n\tExpected: '${expected}'`;
};

// @ts-ignore
for (const [params, answer] of tests)
  test(calcSplit(...params), answer, params);

const testsCalcSplitSelection = [
  [
    ['<a href="xyz"><p>This is a link</p></a>', 5, 9],
    '<a href="xyz"><p>is a</p></a>',
  ],
  [
    [
      '<a href="xyz"><p>This is a link</p><title> Ahh, fantastic</title></a>',
      5,
      19,
    ],
    '<a href="xyz"><p>is a link</p><title> Ahh,</title></a>',
  ],
  [
    [
      '<a href="xyz"><title>Ahh, fantastic</title><p>This is a link</p></a>',
      5,
      19,
    ],
    '<a href="xyz"><title>fantastic</title><p>This </p></a>',
  ],
];

// @ts-ignore
for (const [params, answer] of testsCalcSplitSelection)
  test(calcSplitSelection(...params), answer, params);
