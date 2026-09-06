import React, { useState } from "react";

import { PenIcon, BanIcon } from "lucide-react";

import { CreateTaskModal } from "../components/CreateTaskModal";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/constants";
import { useQuery, useQueryClient } from "react-query";

export default function Home() {
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedCompleted, setSelectedCompleted] = useState("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const client = useQueryClient();

  const { data } = useQuery(["getAllTasks", selectedPriority, selectedCompleted], async () => {
    const params = new URLSearchParams();

    if (selectedPriority !== "ALL") {
      params.set("priority", selectedPriority);
    }

    if (selectedCompleted !== "ALL") {
      params.set("completed", selectedCompleted);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${apiUrl}/api/v1/tasks${query}`);
    return resp.json();
  });

  const tasks = data?.tasks || [];

  return (
    <main className="flex flex-col w-full h-full justify-center items-center overflow-y-auto">
      <div className="flex flex-col justify-center items-center mt-8">
        <h2 className="text-2xl">Taskio</h2>
        <div>
          <p>Empower Your Productivity: Manage Tasks Effortlessly.</p>
        </div>
      </div>
      <div className="mt-[2rem] flex items-center gap-3 flex-wrap justify-center">
        <button
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded-3xl text-2xl font-extrabold"
          onClick={() => setIsOpen(!isOpen)}
        >
         +
        </button>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="border-2 border-blue-500 rounded-md px-2 py-2"
        >
          <option value="ALL">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <select
          value={selectedCompleted}
          onChange={(e) => setSelectedCompleted(e.target.value)}
          className="border-2 border-blue-500 rounded-md px-2 py-2"
        >
          <option value="ALL">All statuses</option>
          <option value="true">Completed</option>
          <option value="false">Not completed</option>
        </select>
      </div>
      <div className="flex flex-col gap-3 mt-5 w-full md:w-[500px] px-3 mb-9 ">
        {tasks.map((task, idx) => (
          <div
            key={task._id}
            className="bg-white-500 border-blue-500 border-2 px-3 py-2 min-h-24 rounded-md cursor-pointer"
          >
            <div className="flex w-full justify-between items-start gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-bold">{task.title}</p>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-medium ${
                    task.priority === "HIGH"
                      ? "bg-red-100 text-red-700"
                      : task.priority === "LOW"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {task.priority || "MEDIUM"}
                </span>
              </div>
              <div className="flex gap-4 px-8">
                <Link to={`/edit/${task._id}`}>
                  <PenIcon className="h-5 w-5 text-s" />
                </Link>

                <BanIcon
                  className="h-5 w-5 text-red-500"
                  onClick={async () => {
                    const hasAllowedIt = confirm(
                      "Are you sure you want to delete this?"
                    );

                    if (hasAllowedIt) {
                      const resp = await fetch(
                        `${apiUrl}/api/v1/tasks/delete`,
                        {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: task._id }),
                        }
                      );

                      const data = await resp.json();

                      if (data.success) {
                        client.setQueryData("getAllTasks", (oldData) => ({
                          tasks: oldData.tasks.filter(
                            (task) => task._id !== data.task._id
                          ),
                        }));
                      }
                    }
                  }}
                />
              </div>
            </div>
            <p className="font-light text-gray-800 pt-2 px-3">{task.description}</p>
           
          </div>
        ))}
      </div>
      {isOpen ? (
        <CreateTaskModal
          onRequestClose={() => setIsOpen(!isOpen)}
          open={isOpen}
        />
      ) : null}
    </main>
  );
}
