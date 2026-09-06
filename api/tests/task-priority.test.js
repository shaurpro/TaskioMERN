const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const TaskModel = require('../models/tasks.model');
const taskController = require('../controllers/tasks.controller');

const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];

const createMockRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const buildTask = (overrides = {}) => ({
  title: 'Test task',
  description: 'Test description',
  priority: 'MEDIUM',
  ...overrides,
});

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskio_test');
});

test.after(async () => {
  await mongoose.connection.db.dropDatabase().catch(() => {});
  await mongoose.disconnect();
});

test.afterEach(async () => {
  await TaskModel.deleteMany({});
});

test('create task with LOW priority', async () => {
  const task = await new TaskModel(buildTask({ priority: 'LOW' })).save();
  assert.equal(task.priority, 'LOW');
});

test('create task with MEDIUM priority', async () => {
  const task = await new TaskModel(buildTask({ priority: 'MEDIUM' })).save();
  assert.equal(task.priority, 'MEDIUM');
});

test('create task with HIGH priority', async () => {
  const task = await new TaskModel(buildTask({ priority: 'HIGH' })).save();
  assert.equal(task.priority, 'HIGH');
});

test('create task without priority defaults to MEDIUM', async () => {
  const task = await new TaskModel(buildTask({ priority: undefined })).save();
  assert.equal(task.priority, 'MEDIUM');
});

test('create task with invalid priority is rejected', async () => {
  await assert.rejects(
    () => new TaskModel(buildTask({ priority: 'URGENT' })).save(),
    /`URGENT` is not a valid enum value/
  );
});

test('update LOW to HIGH is allowed', async () => {
  const created = await new TaskModel(buildTask({ priority: 'LOW' })).save();

  const updated = await TaskModel.findByIdAndUpdate(
    created._id,
    { priority: 'HIGH' },
    { new: true, runValidators: true }
  );

  assert.equal(updated.priority, 'HIGH');
});

test('update without priority does not change existing priority', async () => {
  const created = await new TaskModel(buildTask({ priority: 'LOW' })).save();

  const updated = await TaskModel.findByIdAndUpdate(
    created._id,
    { title: 'Changed title' },
    { new: true, runValidators: true }
  );

  assert.equal(updated.priority, 'LOW');
});

test('update to invalid priority is rejected', async () => {
  const created = await new TaskModel(buildTask({ priority: 'LOW' })).save();

  await assert.rejects(
    () => TaskModel.findByIdAndUpdate(
      created._id,
      { priority: 'URGENT' },
      { new: true, runValidators: true }
    ),
    /`URGENT` is not a valid enum value/
  );
});

test('fetch a task returns priority field', async () => {
  const created = await new TaskModel(buildTask({ priority: 'HIGH' })).save();
  const found = await TaskModel.findById(created._id);

  assert.equal(found.priority, 'HIGH');
});

test('fetch existing tasks with missing priority defaults to MEDIUM', async () => {
  const rawDoc = await TaskModel.collection.insertOne({
    title: 'Legacy task',
    description: 'No priority stored',
  });

  const task = await TaskModel.findById(rawDoc.insertedId);
  assert.equal(task.title, 'Legacy task');
  assert.equal(task.priority, 'MEDIUM');
});

test('getAll without priority query returns all tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'A', priority: 'LOW' }),
    buildTask({ title: 'B', priority: 'HIGH' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 2);
});

test('getAll with HIGH filter returns only HIGH tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'High task', priority: 'HIGH' }),
    buildTask({ title: 'Low task', priority: 'LOW' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'HIGH' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 1);
  assert.equal(res.body.tasks[0].priority, 'HIGH');
});

test('getAll with LOW filter returns only LOW tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'Low task', priority: 'LOW' }),
    buildTask({ title: 'Medium task', priority: 'MEDIUM' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'LOW' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 1);
  assert.equal(res.body.tasks[0].priority, 'LOW');
});

test('getAll with MEDIUM filter returns medium and legacy missing-priority tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'Medium task', priority: 'MEDIUM' }),
    buildTask({ title: 'Low task', priority: 'LOW' }),
  ]);

  await TaskModel.collection.insertOne({
    title: 'Legacy task',
    description: 'No priority stored',
  });

  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'MEDIUM' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 2);
  assert.ok(res.body.tasks.every((task) => task.priority === 'MEDIUM'));
});

test('getAll with invalid priority query returns client error', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'URGENT' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid priority value' });
});

test('getAll with empty priority query is invalid', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { priority: '' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid priority value' });
});

test('getAll with duplicate priority query params is invalid', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { priority: ['HIGH', 'LOW'] } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid query parameter value' });
});

test('getAll with whitespace priority query is invalid', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { priority: '   ' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid priority value' });
});

test('getAll with completed=true returns only completed tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'Done', completed: true, priority: 'HIGH' }),
    buildTask({ title: 'Pending', completed: false, priority: 'LOW' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: { completed: 'true' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 1);
  assert.equal(res.body.tasks[0].completed, true);
});

test('getAll with completed=false returns only incomplete tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'Done', completed: true, priority: 'HIGH' }),
    buildTask({ title: 'Pending', completed: false, priority: 'LOW' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: { completed: 'false' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 1);
  assert.equal(res.body.tasks[0].completed, false);
});

test('getAll with priority absent and completed present returns filtered completed tasks', async () => {
  await TaskModel.insertMany([
    buildTask({ title: 'Done', completed: true, priority: 'HIGH' }),
    buildTask({ title: 'Pending', completed: false, priority: 'LOW' }),
    buildTask({ title: 'Another done', completed: true, priority: 'MEDIUM' }),
  ]);

  const res = createMockRes();
  await taskController.getAll({ query: { completed: 'true' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 2);
  assert.ok(res.body.tasks.every((task) => task.completed === true));
});

test('getAll with all six priority and completed combinations works', async () => {
  const combos = [
    ['HIGH', 'true'],
    ['HIGH', 'false'],
    ['MEDIUM', 'true'],
    ['MEDIUM', 'false'],
    ['LOW', 'true'],
    ['LOW', 'false'],
  ];

  for (const [priority, completed] of combos) {
    await TaskModel.insertMany([
      buildTask({ title: `${priority}-${completed}-a`, priority, completed: completed === 'true' }),
      buildTask({ title: `${priority}-${completed}-b`, priority: 'LOW', completed: completed === 'false' }),
    ]);
  }

  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'HIGH', completed: 'false' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tasks.length, 1);
  assert.equal(res.body.tasks[0].priority, 'HIGH');
  assert.equal(res.body.tasks[0].completed, false);
});

test('getAll with invalid completed value returns client error', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { completed: 'maybe' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid completed value' });
});

test('getAll with invalid priority and invalid completed together returns client error', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { priority: 'URGENT', completed: 'maybe' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid priority value' });
});

test('getAll with duplicate completed query params is invalid', async () => {
  const res = createMockRes();
  await taskController.getAll({ query: { completed: ['true', 'false'] } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid query parameter value' });
});

for (const priority of validPriorities) {
  test(`schema accepts priority enum value ${priority}`, async () => {
    const task = await new TaskModel(buildTask({ priority })).save();
    assert.equal(task.priority, priority);
  });
}
