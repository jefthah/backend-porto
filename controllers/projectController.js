// controllers/projectController.js
import Project from "../models/project.js";
import { deleteFromCloudinary } from "../middleware/uploadMiddleware.js";


export const createProject = async (req, res) => {
  try {
    const { title, description, techStack, githubRepo, deployLink, demoVideoUrl } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }

    const imageUrl = req.file ? req.file.path : "";

    // Parse techStack if it comes as string (from FormData)
    let parsedTechStack = [];
    if (techStack) {
      try {
        parsedTechStack = typeof techStack === 'string' ? JSON.parse(techStack) : techStack;
      } catch (e) {
        parsedTechStack = [];
      }
    }

    const project = await Project.create({
      title,
      description: description || "",
      techStack: parsedTechStack, // ADD THIS
      githubRepo: githubRepo || "",
      deployLink: deployLink || "",
      demoVideoUrl: demoVideoUrl || "",
      imageUrl,
    });

    res.status(201).json({ 
      success: true, 
      message: "Project created successfully",
      data: project 
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create project" 
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { title, description, techStack, githubRepo, deployLink, demoVideoUrl } = req.body;
    
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (githubRepo !== undefined) updateData.githubRepo = githubRepo;
    if (deployLink !== undefined) updateData.deployLink = deployLink;
    if (demoVideoUrl !== undefined) updateData.demoVideoUrl = demoVideoUrl;
    
    // Parse and update techStack
    if (techStack !== undefined) {
      try {
        updateData.techStack = typeof techStack === 'string' ? JSON.parse(techStack) : techStack;
      } catch (e) {
        updateData.techStack = [];
      }
    }
    
    if (req.file) {
      if (existingProject.imageUrl) {
        await deleteFromCloudinary(existingProject.imageUrl);
      }
      updateData.imageUrl = req.file.path;
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, select: "-__v" }
    );
    
    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update project",
    });
  }
};

export const listProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select("-__v").lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Tidak perlu manipulasi URL
    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Delete image from Cloudinary
    if (project.imageUrl) {
      await deleteFromCloudinary(project.imageUrl);
    }

    await project.deleteOne();

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};
