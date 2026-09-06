const _ = require("lodash");

const TaskModel = require("../models/tasks.model");

const foodController = {
  getOneTask: async (req, res) => {
    const id = req.params.id;

    if (!id) {
      return res.json({ error: "You must provide the id of task" }).status(400);
    }

    const task = await TaskModel.findById(id);

    return res.json({ task }).status(200);
  },
  getAll: async (req, res) => {
    const allowedPriorities = ["LOW", "MEDIUM", "HIGH"];
    const rawPriority = req.query.priority;

    if (Array.isArray(rawPriority)) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    const priority = typeof rawPriority === "string" ? rawPriority.trim() : rawPriority;

    if (priority === "" || priority === null || priority === undefined) {
      if (rawPriority !== undefined) {
        return res.status(400).json({ error: "Invalid priority value" });
      }
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    const query = priority ? { priority } : {};

    if (priority === "MEDIUM") {
      const tasks = await TaskModel.find({
        $or: [{ priority: "MEDIUM" }, { priority: { $exists: false } }],
      });
      return res.json({ tasks });
    }

    const tasks = await TaskModel.find(query);
    return res.json({ tasks });
  },
  createTask: async (req, res) => {
    const bodyParams = _.pick(req.body, ["title", "description", "priority"]);

    if (!bodyParams.title || !bodyParams.description) {
      return res.json({ error: "You must provide all the fields" }).status(400);
    }

    try {
      const task = new TaskModel({
        title: bodyParams.title,
        description: bodyParams.description,
        priority: bodyParams.priority,
      });

      await task.save();

      return res.json({ task, success: true }).status(200);
    } catch (error) {
      console.log(error);
      return res
        .json({
          error: "Internal server error",
          message: error.message,
        })
        .status(500);
    }
  },
  deleteTask: async (req, res) => {
    const bodyParams = _.pick(req.body, ["id"]);

    if (!bodyParams.id) {
      return res.json({ error: "You must provide the id of task" }).status(400);
    }

    try {
      const task = await TaskModel.findByIdAndDelete(bodyParams.id);

      return res.json({ success: true, task }).status(200);
    } catch (error) {
      console.log(error);
      return res
        .json({
          error: "Internal server error",
          message: error.message,
          success: false,
        })
        .status(500);
    }
  },
  updateTask: async (req, res) => {
    const bodyParams = _.pick(req.body, ["title", "description", "priority", "id"]);

    if (!bodyParams.title || !bodyParams.description || !bodyParams.id) {
      return res.json({ error: "You must provide all the fields" }).status(400);
    }

    if (bodyParams.priority === "" || bodyParams.priority === null || bodyParams.priority === undefined) {
      return res.json({ error: "Invalid priority value" }).status(400);
    }

    try {
      const updateData = {
        title: bodyParams.title,
        description: bodyParams.description,
      };

      if (bodyParams.priority) {
        updateData.priority = bodyParams.priority;
      }

      const task = await TaskModel.findOneAndUpdate(
        { _id: bodyParams.id },
        updateData,
        { new: true, runValidators: true }
      );

      return res.json({ task, success: true }).status(200);
    } catch (error) {
      console.log(error);
      return res
        .json({
          error: "Internal server error",
          message: error.message,
        })
        .status(500);
    }
  },
};

module.exports = foodController;
