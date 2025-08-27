// controllers/projectController.js
import Project from "../models/project.js";
import { deleteFromCloudinary } from "../middleware/uploadMiddleware.js";

export const createProject = async (req, res) => {
  try {
    const { title, description, githubRepo, deployLink } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }

    // PENTING: Gunakan req.file.path dari Cloudinary, BUKAN local path!
    const imageUrl = req.file ? req.file.path : ""; // Cloudinary return URL lengkap di .path

    const project = await Project.create({
      title,
      description: description || "",
      githubRepo: githubRepo || "",
      deployLink: deployLink || "",
      imageUrl, // URL dari Cloudinary (https://res.cloudinary.com/...)
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

export const listProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    // Tidak perlu manipulasi URL, Cloudinary sudah return URL lengkap
    res.json({ 
      success: true, 
      count: projects.length,
      data: projects 
    });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch projects" 
    });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select("-__v")
      .lean();
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    // Tidak perlu manipulasi URL
    res.json({ 
      success: true, 
      data: project 
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch project" 
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { title, description, githubRepo, deployLink } = req.body;
    
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
    
    // Handle new image upload
    if (req.file) {
      // Delete old image from Cloudinary
      if (existingProject.imageUrl) {
        await deleteFromCloudinary(existingProject.imageUrl);
      }
      updateData.imageUrl = req.file.path; // URL baru dari Cloudinary
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