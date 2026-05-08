'use client';
import { useState, useEffect } from 'react';
import { Plus, X, Award, Code, Briefcase } from 'lucide-react';
import api from '../lib/axios';

export default function SkillsManager({ studentId }) {
  const [skills, setSkills] = useState({ skills: [], certifications: [], projects: [] });
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '' });
  const [newProject, setNewProject] = useState({ name: '', tech: [], description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, [studentId]);

  const fetchSkills = async () => {
    try {
      const response = await api.get(`/placement/skills/${studentId}`);
      setSkills(response.data);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  const saveSkills = async () => {
    setLoading(true);
    try {
      await api.post(`/placement/skills/${studentId}`, skills);
    } catch (error) {
      console.error('Failed to save skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.skills.includes(newSkill.trim())) {
      setSkills(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setSkills(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addCertification = () => {
    if (newCert.name && newCert.issuer) {
      setSkills(prev => ({ ...prev, certifications: [...prev.certifications, newCert] }));
      setNewCert({ name: '', issuer: '', date: '' });
    }
  };

  const addProject = () => {
    if (newProject.name && newProject.description) {
      setSkills(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
      setNewProject({ name: '', tech: [], description: '' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Skills & Profile</h3>
        <button 
          onClick={saveSkills}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Skills Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Code className="h-5 w-5 text-blue-500" />
          <h4 className="font-medium">Technical Skills</h4>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.skills.map((skill) => (
            <span 
              key={skill}
              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
              <button onClick={() => removeSkill(skill)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill (e.g., JavaScript, Python)"
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
          />
          <button 
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Certifications Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-5 w-5 text-green-500" />
          <h4 className="font-medium">Certifications</h4>
        </div>

        <div className="space-y-2 mb-3">
          {skills.certifications.map((cert, index) => (
            <div key={index} className="p-3 bg-green-50 rounded border-l-4 border-green-500">
              <div className="font-medium">{cert.name}</div>
              <div className="text-sm text-gray-600">{cert.issuer} • {cert.date}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <input
            type="text"
            value={newCert.name}
            onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Certification name"
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="text"
            value={newCert.issuer}
            onChange={(e) => setNewCert(prev => ({ ...prev, issuer: e.target.value }))}
            placeholder="Issuing organization"
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="date"
            value={newCert.date}
            onChange={(e) => setNewCert(prev => ({ ...prev, date: e.target.value }))}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button 
          onClick={addCertification}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Certification
        </button>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-5 w-5 text-purple-500" />
          <h4 className="font-medium">Projects</h4>
        </div>

        <div className="space-y-3 mb-3">
          {skills.projects.map((project, index) => (
            <div key={index} className="p-3 bg-purple-50 rounded border-l-4 border-purple-500">
              <div className="font-medium">{project.name}</div>
              <div className="text-sm text-gray-600 mb-1">{project.description}</div>
              <div className="flex flex-wrap gap-1">
                {project.tech.map((tech) => (
                  <span key={tech} className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={newProject.name}
            onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Project name"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            value={newProject.description}
            onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Project description"
            rows={2}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            value={newProject.tech.join(', ')}
            onChange={(e) => setNewProject(prev => ({ ...prev, tech: e.target.value.split(',').map(t => t.trim()) }))}
            placeholder="Technologies used (comma separated)"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button 
            onClick={addProject}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Add Project
          </button>
        </div>
      </div>
    </div>
  );
}