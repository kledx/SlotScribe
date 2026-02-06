'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Activity,
    MessageSquare,
    Clock,
    Trophy,
    CheckCircle2,
    AlertCircle,
    Fingerprint,
    Twitter,
    ExternalLink,
    RefreshCw,
    HeartPulse,
    Globe,
    User,
    UserCheck,
    Reply,
    Link2
} from 'lucide-react';

interface Post {
    id: number;
    title: string;
    agentName: string;
    agentClaim: {
        xUsername: string;
        xProfileImageUrl?: string;
    } | null;
    createdAt: string;
    tags: string[];
}

interface AgentStatus {
    status: string;
    owner: {
        xUsername: string;
        claimedAt: string;
    };
    hackathon: {
        name: string;
        daysRemaining: number;
        timeRemainingFormatted: string;
        isActive: boolean;
    };
    engagement: {
        forumPostCount: number;
        repliesOnYourPosts: number;
        projectStatus: string;
    };
    latestPosts: Post[];
    myPosts: Post[];
    repliedPostIds: number[];
    interactions: {
        postId: number;
        postTitle: string;
        replyBody: string;
        repliedAt: string;
    }[];
    localConfig: {
        heartbeatCount: number;
        lastHeartbeatAt: string | null;
        projectId: string | null;
        pendingActionsCount: number;
        dayKey: string;
        todayMetrics: {
            posts: number;
            comments: number;
            votes: number;
            heartbeats: number;
            queueRetries: number;
            queueFailures: number;
        };
    };
    recentInteractions: {
        postId: number;
        postTitle: string;
        replyBody: string;
        repliedAt: string;
    }[];
    project: {
        id: string | null;
        name: string | null;
        status: string | null;
        url: string | null;
    } | null;
}

export default function AgentDashboard() {
    const [data, setData] = useState<AgentStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedType, setFeedType] = useState<'neighborhood' | 'mine'>('neighborhood');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/status');
            const result = await res.json();
            if (result.error) {
                setError(result.error);
            } else {
                setData(result);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, 60000); // 1 minute auto-refresh
        return () => clearInterval(timer);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-12 h-12 text-brand-green animate-spin mb-4" />
                <p className="text-brand-dark/50 font-medium animate-pulse">Syncing with Colosseum Network...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-red-50 border border-red-100 flex flex-col items-center text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-black text-red-700 mb-2">Sync Error</h1>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                    onClick={fetchData}
                    className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all active:scale-95"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!data) return null;

    const stats = [
        {
            label: 'Heartbeats',
            value: data.localConfig.heartbeatCount,
            icon: HeartPulse,
            color: 'text-rose-500',
            bg: 'bg-rose-50'
        },
        {
            label: 'Forum Posts',
            value: data.engagement.forumPostCount,
            icon: MessageSquare,
            color: 'text-brand-green',
            bg: 'bg-brand-green/10'
        },
        {
            label: 'Replies Made',
            value: data.repliedPostIds.length,
            icon: Reply,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            label: 'Days Left',
            value: data.hackathon.daysRemaining,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
    ];

    // Filter posts for the selected view
    const displayPosts = feedType === 'neighborhood'
        ? data.latestPosts
        : data.latestPosts.filter(p => p.agentName === 'SlotScribe-Agent' || data.repliedPostIds.includes(p.id));

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-brand-green/20 text-brand-green px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border border-brand-green/20">
                            Hackathon Live
                        </span>
                        <div className="flex items-center gap-2 text-brand-dark/40 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            {data.hackathon.timeRemainingFormatted}
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-brand-dark tracking-tighter leading-none mb-4">
                        Agent <span className="text-brand-green">Status</span>
                    </h1>
                    <p className="text-brand-dark/60 text-lg max-w-xl font-medium leading-relaxed">
                        SlotScribe's autonomous agent is actively participating in the Colosseum Hackathon. Monitoring health, engagement, and verification status.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/60 backdrop-blur-xl border border-brand-dark/5 p-4 rounded-[2rem] flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-brand-dark flex items-center justify-center text-white">
                            <Twitter className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-black text-brand-dark/40 leading-none mb-1">Authenticated</p>
                            <p className="text-lg font-black text-brand-dark">@{data.owner.xUsername}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white/60 backdrop-blur-xl border border-brand-dark/5 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow group"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-7 h-7 ${stat.color}`} />
                        </div>
                        <p className="text-4xl font-black text-brand-dark mb-1 tracking-tighter">{stat.value}</p>
                        <p className="text-sm font-bold text-brand-dark/40 uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Status Cards */}
                    <div className="bg-brand-dark text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-10%] w-60 h-60 rounded-full bg-brand-green/10 blur-[60px]"></div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-10">
                            <div className="flex-1">
                                <h3 className="text-brand-green font-black uppercase tracking-[0.2em] text-xs mb-6">Current Mission</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-5 h-5 text-brand-dark" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">Submission Draft Sync</p>
                                            <p className="text-white/50 text-sm">All project metadata synchronized with Colosseum registry.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 opacity-50">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                                            <RefreshCw className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">Presentation Video</p>
                                            <p className="text-white/50 text-sm">Awaiting video link for final judging package.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-px bg-white/10 hidden md:block"></div>

                            <div className="flex flex-col justify-between py-2">
                                <div>
                                    <p className="text-white/40 text-[10px] uppercase font-black mb-2 italic">Project ID</p>
                                    <code className="bg-white/10 px-4 py-2 rounded-xl text-brand-green font-mono text-xs border border-white/5 block truncate w-full max-w-[150px]">
                                        {data.project?.id || data.localConfig.projectId || 'NOT_CREATED'}
                                    </code>
                                    <div className="mt-3">
                                        <p className="text-white/40 text-[10px] uppercase font-black mb-1 italic">Project URL</p>
                                        {data.project?.url ? (
                                            <Link
                                                href={data.project.url}
                                                target="_blank"
                                                className="inline-flex items-center gap-1 text-[11px] font-black text-brand-green hover:underline"
                                            >
                                                Open Project
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        ) : (
                                            <p className="text-[11px] text-white/50">Unavailable</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <p className="text-white/40 text-[10px] uppercase font-black mb-1">Status</p>
                                    <p className="text-2xl font-black uppercase text-brand-green animate-pulse inline-flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-brand-green"></span>
                                        {data.project?.status || data.engagement.projectStatus}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feed Section */}
                    <div className="bg-white/60 backdrop-blur-xl border border-brand-dark/5 p-10 rounded-[3rem]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <h3 className="text-brand-dark font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                <Globe className="w-4 h-4 text-brand-green" />
                                {feedType === 'neighborhood' ? 'Neighborhood Feed' : 'My Activity Highlights'}
                            </h3>

                            {/* Feed Toggle */}
                            <div className="flex p-1 bg-brand-beige/50 rounded-2xl border border-brand-dark/5">
                                <button
                                    onClick={() => setFeedType('neighborhood')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedType === 'neighborhood'
                                            ? 'bg-brand-dark text-white shadow-lg'
                                            : 'text-brand-dark/40 hover:text-brand-dark'
                                        }`}
                                >
                                    Global
                                </button>
                                <button
                                    onClick={() => setFeedType('mine')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedType === 'mine'
                                            ? 'bg-brand-green text-brand-dark shadow-lg shadow-brand-green/20'
                                            : 'text-brand-dark/40 hover:text-brand-dark'
                                        }`}
                                >
                                    My Agent
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {displayPosts.map((post) => {
                                const isMyPost = post.agentName === 'SlotScribe-Agent';
                                const iReplied = data.repliedPostIds.includes(post.id);

                                return (
                                    <div key={post.id} className={`group p-6 rounded-[2rem] border transition-all ${isMyPost
                                            ? 'bg-brand-green/5 border-brand-green/20 shadow-sm'
                                            : 'bg-white/40 hover:bg-white border-transparent hover:border-brand-dark/5'
                                        }`}>
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-brand-dark/5 overflow-hidden shrink-0 ${isMyPost ? 'bg-brand-green shadow-sm shadow-brand-green/20' : 'bg-brand-beige'
                                                }`}>
                                                {post.agentClaim?.xProfileImageUrl ? (
                                                    <img src={post.agentClaim.xProfileImageUrl} alt={post.agentName} className="w-full h-full object-cover" />
                                                ) : isMyPost ? (
                                                    <UserCheck className="w-5 h-5 text-brand-dark" />
                                                ) : (
                                                    <User className="w-5 h-5 text-brand-dark/20" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-black text-sm truncate ${isMyPost ? 'text-brand-dark' : 'text-brand-dark'}`}>
                                                        {post.agentName}
                                                        {isMyPost && <span className="ml-2 text-[9px] bg-brand-green text-brand-dark px-1.5 py-0.5 rounded uppercase leading-none">Me</span>}
                                                    </span>
                                                    {post.agentClaim?.xUsername && (
                                                        <span className="text-[10px] font-bold text-brand-dark/30 uppercase">@{post.agentClaim.xUsername}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-brand-dark/40 font-medium whitespace-nowrap">
                                                    {new Date(post.createdAt).toLocaleString()}
                                                    {iReplied && !isMyPost && <span className="ml-3 text-brand-green font-black uppercase text-[9px] tracking-wide">✓ Replied by LLM</span>}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                {post.tags.slice(0, 2).map((tag, idx) => (
                                                    <span key={idx} className="bg-brand-beige text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md text-brand-dark/50">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <h4 className={`text-lg font-bold transition-colors leading-snug ${isMyPost ? 'text-brand-dark' : 'text-brand-dark group-hover:text-brand-green'
                                            } ${iReplied && !isMyPost ? 'mb-3' : ''}`}>
                                            {post.title}
                                        </h4>

                                        {/* SlotScribe's Reply Content */}
                                        {iReplied && !isMyPost && (
                                            <div className="bg-brand-green/10 border-l-4 border-brand-green p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-left-2 duration-500">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="w-3 h-3 text-brand-green" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-brand-green">SlotScribe's Reply</span>
                                                </div>
                                                <p className="text-sm font-medium text-brand-dark/80 italic leading-relaxed">
                                                    "{data.interactions?.find(i => i.postId === post.id)?.replyBody || 'Reply content syncing...'}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {displayPosts.length === 0 && (
                                <div className="py-20 text-center">
                                    <Globe className="w-12 h-12 text-brand-dark/5 mx-auto mb-4" />
                                    <p className="text-brand-dark/30 font-medium italic">
                                        {feedType === 'mine' ? 'No recent personal activity recorded...' : 'No neighborhood activity detected...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Rank Card */}
                    <div className="bg-brand-green text-brand-dark p-8 rounded-[3rem] shadow-lg shadow-brand-green/10">
                        <Trophy className="w-12 h-12 mb-6" />
                        <h4 className="text-2xl font-black tracking-tight mb-4 leading-tight">Project Rank & Visibility</h4>
                        <p className="font-medium text-brand-dark/70 mb-8 leading-relaxed">
                            Engagement activities (forum posts and votes) help increase project visibility for judges.
                        </p>
                        <div className="bg-black/5 p-6 rounded-2xl border border-black/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase opacity-60">Engagement Score</span>
                                <span className="font-black">74%</span>
                            </div>
                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-dark" style={{ width: '74%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Evidence Card */}
                    <div className="p-8 border border-brand-dark/5 bg-white/40 rounded-[3rem]">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-sm uppercase tracking-widest text-brand-dark/40">Autonomy Evidence</h4>
                            <Fingerprint className="w-4 h-4 text-brand-green" />
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">Heartbeat Count</span>
                                <span className="text-sm font-black text-brand-green">{data.localConfig.heartbeatCount}</span>
                            </div>
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">Replies Posted</span>
                                <span className="text-sm font-black text-blue-500">{data.repliedPostIds.length}</span>
                            </div>
                        </div>
                        <p className="mt-6 text-[10px] text-brand-dark/30 font-medium leading-relaxed italic text-center">
                            Verification hashes are automatically anchored to Solana devnet every 4 hours.
                        </p>
                    </div>

                    {/* Last Activity Card */}
                    <div className="p-8 border border-brand-dark/5 bg-white/40 rounded-[3rem]">
                        <h4 className="font-black text-sm uppercase tracking-widest text-brand-dark/40 mb-6">Last Heartbeat</h4>
                        <div className="flex items-center gap-4 mb-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <span className="font-bold text-brand-dark">
                                {data.localConfig.lastHeartbeatAt
                                    ? new Date(data.localConfig.lastHeartbeatAt).toLocaleString()
                                    : 'No history'}
                            </span>
                        </div>
                        <p className="text-xs text-brand-dark/50 font-medium leading-relaxed pl-9">
                            Automatic heartbeat cycle detected and synced with Colosseum network API.
                        </p>
                    </div>

                    {/* Agent Report Card */}
                    <div className="p-8 border border-brand-dark/5 bg-white/40 rounded-[3rem]">
                        <h4 className="font-black text-sm uppercase tracking-widest text-brand-dark/40 mb-6">Agent Report</h4>
                        <div className="space-y-3 mb-6">
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">KPI Day</span>
                                <span className="text-xs font-black text-brand-dark">{data.localConfig.dayKey}</span>
                            </div>
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">Posts / Comments / Votes</span>
                                <span className="text-xs font-black text-brand-green">
                                    {data.localConfig.todayMetrics.posts} / {data.localConfig.todayMetrics.comments} / {data.localConfig.todayMetrics.votes}
                                </span>
                            </div>
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">Queue (Pending)</span>
                                <span className={`text-xs font-black ${data.localConfig.pendingActionsCount > 0 ? 'text-amber-500' : 'text-brand-green'}`}>
                                    {data.localConfig.pendingActionsCount}
                                </span>
                            </div>
                            <div className="p-4 bg-white/60 rounded-2xl flex items-center justify-between border border-brand-dark/5">
                                <span className="text-xs font-bold text-brand-dark">Queue Retry / Fail</span>
                                <span className="text-xs font-black text-brand-dark">
                                    {data.localConfig.todayMetrics.queueRetries} / {data.localConfig.todayMetrics.queueFailures}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 bg-white/60 rounded-2xl border border-brand-dark/5 mb-6">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold text-brand-dark">Project URL</span>
                                {data.project?.url ? (
                                    <Link
                                        href={data.project.url}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-[11px] font-black text-brand-green hover:underline"
                                    >
                                        Open
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                ) : (
                                    <span className="text-[11px] font-bold text-brand-dark/40">Unavailable</span>
                                )}
                            </div>
                            <p className="text-[11px] text-brand-dark/60 mt-2 truncate flex items-center gap-2">
                                <Link2 className="w-3 h-3 shrink-0 text-brand-dark/30" />
                                {data.project?.url || 'No public project link returned by Colosseum API'}
                            </p>
                        </div>
                        <h5 className="font-black text-[10px] uppercase tracking-widest text-brand-dark/40 mb-3">Recent Replies</h5>
                        <div className="space-y-2 max-h-44 overflow-auto pr-1">
                            {data.recentInteractions?.length ? data.recentInteractions.map((item) => (
                                <div key={`${item.postId}-${item.repliedAt}`} className="p-3 bg-white/70 rounded-xl border border-brand-dark/5">
                                    <p className="text-[11px] font-bold text-brand-dark truncate">{item.postTitle}</p>
                                    <p className="text-[10px] text-brand-dark/40">{new Date(item.repliedAt).toLocaleString()}</p>
                                </div>
                            )) : (
                                <p className="text-xs text-brand-dark/40 italic">No reply activity yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
