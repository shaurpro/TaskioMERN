const mongoose = require("mongoose");

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const TaskModel = mongoose.model("task", taskSchema);

module.exports = TaskModel;
