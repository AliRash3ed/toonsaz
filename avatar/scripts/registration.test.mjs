import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import '../assets/avatar-forma.js';
import '../assets/avatar-profiles.js';

// Every new cast member has to be registered in several places: the Studio
// variables enum, the library server's validation set, the job runner's curated
// list, and the harness document. These checks fail loudly when one drifts.
const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');
const quoted = (source) => [...source.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);

const avatars = globalThis.AvatarProfiles.avatars;
const ids = avatars.map((avatar) => avatar.id);
const formaIds = ids.filter((id) => id.startsWith('forma-'));

const findLine = (source, prefix) => source
  .split('\n')
  .find((entry) => entry.trimStart().startsWith(prefix));

const enumOptions = async () => {
  const source = await read('../index.html');
  const line = source.split('\n').find((entry) => entry.includes('"id":"avatar"'));
  assert.ok(line, 'index.html must declare the avatar variable');
  const json = line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1);
  return JSON.parse(json).options;
};

const libraryServerIds = async () => {
  const source = await read('./library-server.mjs');
  const line = findLine(source, 'const avatars = new Set(');
  assert.ok(line, 'library-server.mjs must declare its avatar allow-list');
  return quoted(line);
};

const curatedIds = async () => {
  const source = await read('./avatar-job.mjs');
  const line = findLine(source, 'const curatedAvatars = new Set(');
  assert.ok(line, 'avatar-job.mjs must declare its curated avatar list');
  return quoted(line);
};

const libraryHiddenIds = async () => {
  const source = await read('../library.js');
  const line = findLine(source, 'const hiddenProfiles = new Set(');
  assert.ok(line, 'library.js must declare the hidden cast list');
  return quoted(line);
};

test('the Studio avatar variable exposes every profile in registry order', async () => {
  const options = await enumOptions();
  assert.deepEqual(options, ['saved', ...ids]);
});

test('the library server accepts exactly the registered avatar ids', async () => {
  const allowed = await libraryServerIds();
  assert.deepEqual(allowed, ids);
  assert.equal(new Set(allowed).size, allowed.length);
});

test('the job runner curates every Forma2D id and nothing unknown', async () => {
  const curated = await curatedIds();
  assert.equal(new Set(curated).size, curated.length);
  for (const id of curated) assert.ok(ids.includes(id), `unknown curated avatar: ${id}`);
  for (const id of formaIds) assert.ok(curated.includes(id), `Forma2D avatar missing from the curated list: ${id}`);
});

test('the library editor only hides ids that exist', async () => {
  const hidden = await libraryHiddenIds();
  assert.equal(new Set(hidden).size, hidden.length);
  for (const id of hidden) assert.ok(ids.includes(id), `hidden avatar is not registered: ${id}`);
  assert.ok(hidden.length < ids.length, 'the cast strip cannot be empty');
});

test('the harness document lists every curated avatar id', async () => {
  const document = await read('../AI_AVATAR_VIDEO_HARNESS.md');
  const documented = new Set([...document.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map((match) => match[1]));
  for (const id of await curatedIds()) assert.ok(documented.has(id), `harness document omits: ${id}`);
});
