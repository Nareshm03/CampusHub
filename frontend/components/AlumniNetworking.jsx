'use client';
import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import Card from './ui/Card';
import Button from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon, 
  BriefcaseIcon, 
  AcademicCapIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const AlumniNetworking = () => {
  const [activeTab, setActiveTab] = useState('alumni');
  const [alumni, setAlumni] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'alumni') fetchAlumni();
    if (activeTab === 'jobs') fetchJobs();
    if (activeTab === 'mentors') fetchMentors();
  }, [activeTab]);

  const fetchAlumni = async () => {
    try {
      const response = await axios.get('/alumni');
      setAlumni(response.data.data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
    } finally { setLoading(false); }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/alumni/jobs');
      setJobs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally { setLoading(false); }
  };

  const fetchMentors = async () => {
    try {
      const response = await axios.get('/alumni/mentors');
      setMentors(response.data.data || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally { setLoading(false); }
  };

  const requestMentorship = async (mentorId) => {
    try {
      await axios.post(`/alumni/mentors/${mentorId}/request`);
      alert('Mentorship request sent successfully!');
    } catch (error) {
      console.error('Error requesting mentorship:', error);
      alert('Failed to send mentorship request');
    }
  };

  const tabs = [
    { id: 'alumni', label: 'Directory', icon: UserGroupIcon, color: 'text-blue-500', bg: 'bg-blue-500' },
    { id: 'jobs', label: 'Opportunities', icon: BriefcaseIcon, color: 'text-purple-500', bg: 'bg-purple-500' },
    { id: 'mentors', label: 'Find Mentors', icon: AcademicCapIcon, color: 'text-emerald-500', bg: 'bg-emerald-500' }
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            Alumni Network
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg max-w-2xl">
            Connect with graduates, discover career opportunities, and find industry mentors.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full sm:w-auto relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full sm:w-72 pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 shadow-sm"
            placeholder="Search network..."
          />
        </div>
      </motion.div>

      {/* Segmented Tabs */}
      <div className="flex justify-center sm:justify-start mb-10">
        <div className="inline-flex p-1.5 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-inner border border-gray-200/50 dark:border-gray-700/50">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 py-2.5 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                  isActive 
                    ? `text-white shadow-md` 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-xl ${tab.bg} shadow-lg`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : tab.color}`} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              
              {/* ALUMNI DIRECTORY */}
              {activeTab === 'alumni' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {alumni.length === 0 ? (
                    <EmptyState icon={UserGroupIcon} title="No Alumni Found" desc="Check back later for new network members." />
                  ) : (
                    alumni.map((alum, i) => (
                      <motion.div key={alum._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                        <Card className="h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group">
                          <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-2xl">
                                  {alum.studentId?.userId?.name?.charAt(0) || 'A'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight">{alum.studentId?.userId?.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">{alum.currentPosition}</p>
                              </div>
                            </div>

                            <div className="space-y-3 mb-6 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                              <InfoRow icon={BuildingOfficeIcon} label={alum.currentCompany} />
                              <InfoRow icon={AcademicCapIcon} label={`${alum.studentId?.department?.name || 'Dept'} • Class of ${alum.graduationYear}`} />
                              <InfoRow icon={EnvelopeIcon} label={alum.studentId?.userId?.email} />
                            </div>

                            {alum.linkedinProfile && (
                              <Button variant="secondary" className="w-full bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-none" onClick={() => window.open(alum.linkedinProfile, '_blank')}>
                                View LinkedIn Profile
                              </Button>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* JOB OPPORTUNITIES */}
              {activeTab === 'jobs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobs.length === 0 ? (
                    <EmptyState icon={BriefcaseIcon} title="No Opportunities" desc="There are no job postings at the moment." className="col-span-full" />
                  ) : (
                    jobs.map((jobData, i) => (
                      <motion.div key={jobData._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                        <Card className="h-full flex flex-col bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-l-4 border-l-purple-500 hover:shadow-2xl transition-all duration-300">
                          <div className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4 gap-4">
                              <div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white">{jobData.job.title}</h3>
                                <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-gray-300 font-medium">
                                  <BuildingOfficeIcon className="w-5 h-5 text-purple-500" />
                                  {jobData.job.company}
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full whitespace-nowrap">
                                {new Date(jobData.job.postedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                              <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {jobData.job.location}</span>
                              {jobData.job.salary && <span className="flex items-center gap-1 border-l pl-4 border-gray-300 dark:border-gray-600"><span className="font-semibold text-gray-700 dark:text-gray-300">{jobData.job.salary}</span></span>}
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 flex-grow">{jobData.job.description}</p>
                            
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between mt-auto">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Posted by <span className="font-medium text-gray-900 dark:text-gray-200">{jobData.postedBy.name}</span>
                              </div>
                              {jobData.job.contactEmail && (
                                <a
                                  href={`mailto:${jobData.job.contactEmail}`}
                                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/30 transition-all hover:-translate-y-0.5"
                                >
                                  Apply Now
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* FIND MENTORS */}
              {activeTab === 'mentors' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mentors.length === 0 ? (
                    <EmptyState icon={AcademicCapIcon} title="No Mentors Yet" desc="Alumni can opt-in to become mentors soon." className="col-span-full" />
                  ) : (
                    mentors.map((mentor, i) => (
                      <motion.div key={mentor._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                        <Card className="h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 text-center flex flex-col relative overflow-hidden group">
                          {/* Decorative Background Blob */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                          
                          <div className="p-6 flex-grow flex flex-col items-center relative z-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-full flex items-center justify-center mb-4 shadow-inner">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-3xl">
                                {mentor.studentId?.userId?.name?.charAt(0) || 'M'}
                              </span>
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{mentor.studentId?.userId?.name}</h3>
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">{mentor.currentPosition}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{mentor.currentCompany}</p>
                            
                            <div className="flex flex-wrap justify-center gap-2 mb-6 mt-auto">
                              {mentor.mentorshipAreas?.slice(0, 3).map((area, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  {area}
                                </span>
                              ))}
                              {mentor.mentorshipAreas?.length > 3 && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-medium rounded-lg">
                                  +{mentor.mentorshipAreas.length - 3}
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={() => requestMentorship(mentor._id)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/30 hover:-translate-y-0.5"
                            >
                              Request Mentorship
                            </button>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Helper Components
const InfoRow = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
    <Icon className="w-4 h-4 text-gray-400" />
    <span className="truncate">{label}</span>
  </div>
);

const EmptyState = ({ icon: Icon, title, desc, className = '' }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 dark:bg-gray-800/20 border border-dashed border-gray-300 dark:border-gray-700 rounded-3xl ${className}`}>
    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm">{desc}</p>
  </div>
);

export default AlumniNetworking;