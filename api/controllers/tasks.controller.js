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
    const allowedCompleted = ["true", "false"];

    const rawPriority = req.query.priority;
    const rawCompleted = req.query.completed;

    if (Array.isArray(rawPriority) || Array.isArray(rawCompleted)) {
      return res.status(400).json({ error: "Invalid query parameter value" });
    }

    const priority = typeof rawPriority === "string" ? rawPriority.trim() : rawPriority;
    const completedValue = typeof rawCompleted === "string" ? rawCompleted.trim() : rawCompleted;

    if (
      rawPriority !== undefined &&
      (priority === "" || priority === null || !allowedPriorities.includes(priority))
    ) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    if (
      rawCompleted !== undefined &&
      (completedValue === "" || completedValue === null || !allowedCompleted.includes(completedValue))
    ) {
      return res.status(400).json({ error: "Invalid completed value" });
    }

    const query = {};

    if (priority) {
      if (priority === "MEDIUM") {
        query.$or = [{ priority: "MEDIUM" }, { priority: { $exists: false } }];
      } else {
        query.priority = priority;
      }
    }

    if (rawCompleted !== undefined) {
      query.completed = completedValue === "true";
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
