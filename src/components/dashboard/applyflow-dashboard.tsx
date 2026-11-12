"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRoundCheck,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applicationActivity,
  initialJobs,
  pipelineStages,
  profileCoverage,
  sourcePerformance,
  weeklyTrend,
  type JobMatch,
  type QueueStatus,
} from "@/lib/demo-data";
import styles from "@/app/page.module.css";

type QueueTab = "review" | "ready" | "history";
type ActivityTone = (typeof applicationActivity)[number]["tone"];
type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: ActivityTone;
};

const queueTabOrder: QueueTab[] = ["review", "ready", "history"];
const initialSentCount = initialJobs.filter((job) => job.status === "sent").length;
const initialTrackedCount = pipelineStages[pipelineStages.length - 1]?.value ?? 0;

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "review-queue", label: "Review queue", icon: Inbox },
  { id: "applications", label: "Applications", icon: Send },
  { id: "sources", label: "Sources", icon: BarChart3 },
  { id: "profile", label: "Preferences", icon: SlidersHorizontal },
];

const statusLabels: Record<QueueStatus, string> = {
  review: "Needs review",
  ready: "Ready to send",
  skipped: "Skipped",
  sent: "Sent",
};

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className={styles.scoreRing}
      style={{
        background: `conic-gradient(#8cffbc ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
      }}
      role="img"
      aria-label={`${score}% match score`}
    >
      <span>{score}</span>
    </div>
  );
}

export function ApplyFlowDashboard() {
  const [jobs, setJobs] = useState<JobMatch[]>(initialJobs);
  const [activity, setActivity] = useState<ActivityItem[]>(() => [
    ...applicationActivity,
  ]);
  const [queueTab, setQueueTab] = useState<QueueTab>("review");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [sortBy, setSortBy] = useState("Best match");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [answeredFields, setAnsweredFields] = useState<Record<string, boolean>>({});
  const [notificationsRead, setNotificationsRead] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const activitySequenceRef = useRef(0);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const reviewCount = jobs.filter((job) => job.status === "review").length;
  const readyCount = jobs.filter((job) => job.status === "ready").length;
  const historyCount = jobs.filter(
    (job) => job.status === "sent" || job.status === "skipped",
  ).length;
  const sentCount = jobs.filter((job) => job.status === "sent").length;
  const trackedApplicationCount =
    initialTrackedCount + Math.max(0, sentCount - initialSentCount);
  const sourceOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.source))).sort(),
    [jobs],
  );

  const livePipelineStages = useMemo(
    () =>
      pipelineStages.map((stage, index) =>
        index === pipelineStages.length - 1
          ? {
              ...stage,
              value: trackedApplicationCount,
              detail: `${Math.round((trackedApplicationCount / pipelineStages[0].value) * 100)}% of listings`,
            }
          : stage,
      ),
    [trackedApplicationCount],
  );

  const filteredJobs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return jobs
      .filter((job) => {
        const matchesTab =
          queueTab === "history"
            ? job.status === "sent" || job.status === "skipped"
            : job.status === queueTab;
        const matchesSource =
          sourceFilter === "All sources" || job.source === sourceFilter;
        const matchesSearch =
          !normalizedSearch ||
          job.title.toLowerCase().includes(normalizedSearch) ||
          job.company.toLowerCase().includes(normalizedSearch) ||
          job.skills.some((skill) => skill.toLowerCase().includes(normalizedSearch));
        return matchesTab && matchesSource && matchesSearch;
      })
      .sort((a, b) =>
        sortBy === "Newest" ? a.id.localeCompare(b.id) * -1 : b.score - a.score,
      );
  }, [jobs, queueTab, searchTerm, sortBy, sourceFilter]);

  const selectedJobMissingAnswers = selectedJob
    ? selectedJob.screening.filter(
        (answer) =>
          !answer.complete &&
          !answeredFields[`${selectedJob.id}:${answer.label}`],
      ).length
    : 0;
  const selectedCoverLetterStatus =
    selectedJob?.coverLetter === "Draft needs one answer" &&
    selectedJobMissingAnswers === 0
      ? "Personalized draft ready"
      : selectedJob?.coverLetter;

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menuTrigger = menuTriggerRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      sidebarRef.current
        ?.querySelector<HTMLElement>("button, a[href]")
        ?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.requestAnimationFrame(() => menuTrigger?.focus());
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    const drawer = drawerRef.current;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFrame = window.requestAnimationFrame(() => {
      drawer?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    const handleDrawerKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedJobId(null);
        return;
      }

      if (event.key !== "Tab" || !drawer) {
        return;
      }

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDrawerKeys);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKeys);
      window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
    };
  }, [selectedJobId]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2600);
  };

  const recordActivity = (
    title: string,
    detail: string,
    tone: ActivityTone,
  ) => {
    activitySequenceRef.current += 1;
    setActivity((current) => [
      {
        id: `LIVE-${activitySequenceRef.current}`,
        title,
        detail,
        time: "Just now",
        tone,
      },
      ...current,
    ].slice(0, 5));
  };

  const updateJobStatus = (
    jobId: string,
    status: QueueStatus,
    message: string,
  ) => {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    );
    showToast(message);
  };

  const openJobReview = (jobId: string) => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelectedJobId(jobId);
  };

  const getMissingAnswerCount = (job: JobMatch) =>
    job.screening.filter(
      (answer) =>
        !answer.complete && !answeredFields[`${job.id}:${answer.label}`],
    ).length;

  const handleApprove = (job: JobMatch) => {
    const missingAnswerCount = getMissingAnswerCount(job);
    if (missingAnswerCount > 0) {
      openJobReview(job.id);
      showToast(
        `${missingAnswerCount} screening ${missingAnswerCount === 1 ? "answer needs" : "answers need"} your review.`,
      );
      return;
    }

    updateJobStatus(
      job.id,
      "ready",
      `${job.title} was added to the approved queue.`,
    );
    recordActivity(
      "Application approved",
      `${job.title} at ${job.company}`,
      "green",
    );
  };

  const handleSkip = (job: JobMatch) => {
    updateJobStatus(job.id, "skipped", `${job.title} was skipped.`);
    recordActivity("Listing skipped", `${job.title} at ${job.company}`, "muted");
  };

  const handleReturnToReview = (job: JobMatch) => {
    updateJobStatus(
      job.id,
      "review",
      `${job.title} was returned to review.`,
    );
    recordActivity(
      "Match returned to review",
      `${job.title} at ${job.company}`,
      "blue",
    );
  };

  const handleMarkSent = (job: JobMatch) => {
    updateJobStatus(
      job.id,
      "sent",
      `${job.title} was marked as sent in the demo.`,
    );
    recordActivity(
      "Application marked as sent",
      `${job.title} at ${job.company}`,
      "green",
    );
  };

  const handleRunQueue = () => {
    if (!readyCount) {
      showToast("There are no approved applications to process.");
      return;
    }
    setJobs((current) =>
      current.map((job) =>
        job.status === "ready" ? { ...job, status: "sent" } : job,
      ),
    );
    showToast(`${readyCount} demo applications were marked as sent.`);
    recordActivity(
      "Approved queue processed",
      `${readyCount} ${readyCount === 1 ? "application was" : "applications were"} marked as sent`,
      "green",
    );
  };

  const navigateTo = (sectionId: string) => {
    setActiveNav(sectionId);
    setMenuOpen(false);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleQueueTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: QueueTab,
  ) => {
    const currentIndex = queueTabOrder.indexOf(currentTab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % queueTabOrder.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + queueTabOrder.length) % queueTabOrder.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = queueTabOrder.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = queueTabOrder[nextIndex];
    setQueueTab(nextTab);
    document.getElementById(`queue-tab-${nextTab}`)?.focus();
  };

  const toggleAnswered = (jobId: string, label: string) => {
    const key = `${jobId}:${label}`;
    setAnsweredFields((current) => ({ ...current, [key]: !current[key] }));
  };

  const resetDemo = () => {
    setJobs(initialJobs);
    setActivity([...applicationActivity]);
    setQueueTab("review");
    setSearchTerm("");
    setSourceFilter("All sources");
    setSortBy("Best match");
    setSelectedJobId(null);
    setIsPaused(false);
    setMenuOpen(false);
    setActiveNav("overview");
    setAnsweredFields({});
    setNotificationsRead(false);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    showToast("The demo workspace was reset.");
  };

  return (
    <div className={styles.appShell}>
      <aside
        ref={sidebarRef}
        id="dashboard-navigation"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
        aria-label="ApplyFlow workspace"
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? true : undefined}
      >
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">
            <Sparkles size={17} />
          </div>
          <div>
            <span className={styles.brandName}>ApplyFlow</span>
            <span className={styles.brandTagline}>Application command center</span>
          </div>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Dashboard navigation">
          <span className={styles.navLabel}>Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`${styles.navItem} ${
                  activeNav === item.id ? styles.navItemActive : ""
                }`}
                onClick={() => navigateTo(item.id)}
                aria-current={activeNav === item.id ? "location" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.id === "review-queue" && reviewCount > 0 ? (
                  <span className={styles.navCount}>{reviewCount}</span>
                ) : null}
              </button>
            );
          })}
          <span className={styles.navLabel}>Product</span>
          <Link className={styles.navItem} href="/setup">
            <Settings2 size={17} />
            <span>Profile setup</span>
          </Link>
          <Link className={styles.navItem} href="/extension">
            <WandSparkles size={17} />
            <span>Browser extension</span>
          </Link>
          <Link className={styles.navItem} href="/privacy">
            <ShieldCheck size={17} />
            <span>Privacy center</span>
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.profileMini}>
            <div className={styles.avatar}>AM</div>
            <div>
              <strong>Aljon Mariano</strong>
              <span>Based in the Philippines</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
          <div className={styles.demoNotice}>
            <ShieldCheck size={16} />
            <div>
              <strong>Portfolio demo</strong>
              <span>No external applications are submitted.</span>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className={styles.mobileScrim}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <main className={styles.main} inert={menuOpen ? true : undefined}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}>
            <button
              ref={menuTriggerRef}
              type="button"
              className={styles.iconButton}
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-controls="dashboard-navigation"
              aria-expanded={menuOpen}
            >
              <Menu size={19} />
            </button>
            <span>ApplyFlow</span>
          </div>
          <div className={styles.systemStatus}>
            <span
              className={`${styles.liveDot} ${isPaused ? styles.liveDotPaused : ""}`}
              aria-hidden="true"
            />
            <div>
              <strong>{isPaused ? "Discovery paused" : "Discovery active"}</strong>
              <span>
                {isPaused
                  ? "Your queue is unchanged"
                  : "Last sample scan completed 8 minutes ago"}
              </span>
            </div>
          </div>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={notificationsRead ? "Notifications are clear" : "Show notifications"}
              onClick={() => {
                setNotificationsRead(true);
                showToast("You are all caught up.");
              }}
            >
              <Bell size={18} />
              {!notificationsRead ? (
                <span className={styles.notificationDot} aria-hidden="true" />
              ) : null}
            </button>
            <button
              type="button"
              className={styles.pauseButton}
              onClick={() => {
                setIsPaused((current) => !current);
                showToast(
                  isPaused
                    ? "Demo discovery resumed."
                    : "Demo discovery was paused.",
                );
              }}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
          </div>
        </header>

        <div className={styles.content}>
          <section id="overview" className={styles.heroSection}>
            <div className={styles.eyebrow}>
              <WandSparkles size={14} />
              Demo workspace
            </div>
            <div className={styles.heroRow}>
              <div>
                <h1>Your job search, ready for your decision.</h1>
                <p>
                  ApplyFlow finds possible roles, checks your preferences, prepares
                  accurate answers, and waits for your approval before anything moves.
                </p>
              </div>
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigateTo("review-queue")}
                >
                  Review matches
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleRunQueue}
                >
                  <Send size={16} />
                  Process approved
                </button>
              </div>
            </div>
          </section>

          <section className={styles.metricsGrid} aria-label="Job search metrics">
            <article className={styles.metricCard}>
              <div className={`${styles.metricIcon} ${styles.metricIconBlue}`}>
                <Gauge size={18} />
              </div>
              <span className={styles.metricLabel}>Listings screened</span>
              <strong className={styles.metricValue}>84</strong>
              <span className={styles.metricDetail}>
                <ArrowUpRight size={14} /> 18 since Monday
              </span>
            </article>
            <article className={styles.metricCard}>
              <div className={`${styles.metricIcon} ${styles.metricIconGreen}`}>
                <Target size={18} />
              </div>
              <span className={styles.metricLabel}>Strong matches</span>
              <strong className={styles.metricValue}>18</strong>
              <span className={styles.metricDetail}>21% passed your rules</span>
            </article>
            <article className={styles.metricCard}>
              <div className={`${styles.metricIcon} ${styles.metricIconAmber}`}>
                <Inbox size={18} />
              </div>
              <span className={styles.metricLabel}>Needs your review</span>
              <strong className={styles.metricValue}>{reviewCount}</strong>
              <span className={styles.metricDetail}>{readyCount} approved in this demo</span>
            </article>
            <article className={styles.metricCard}>
              <div className={`${styles.metricIcon} ${styles.metricIconViolet}`}>
                <Send size={18} />
              </div>
              <span className={styles.metricLabel}>Applications tracked</span>
                <strong className={styles.metricValue}>{trackedApplicationCount}</strong>
              <span className={styles.metricDetail}>Across 4 sample sources</span>
            </article>
          </section>

          <section className={styles.analyticsGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>Conversion</span>
                  <h2>Search pipeline</h2>
                  <p>See where listings leave the workflow.</p>
                </div>
                <span className={styles.periodPill}>This week</span>
              </div>
              <div className={styles.pipelineChart}>
                {livePipelineStages.map((stage, index) => (
                  <div className={styles.pipelineRow} key={stage.label}>
                    <div className={styles.pipelineLabel}>
                      <span>{stage.label}</span>
                      <small>{stage.detail}</small>
                    </div>
                    <div
                      className={styles.pipelineTrack}
                      role="progressbar"
                      aria-label={`${stage.label}: ${stage.value}`}
                      aria-valuemin={0}
                      aria-valuemax={pipelineStages[0].value}
                      aria-valuenow={stage.value}
                    >
                      <span
                        style={{ width: `${Math.max((stage.value / 84) * 100, 8)}%` }}
                        className={index === 4 ? styles.pipelineBarFinal : styles.pipelineBar}
                      />
                    </div>
                    <strong>{stage.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>Momentum</span>
                  <h2>Weekly discovery</h2>
                  <p>Volume, matches, and tracked submissions.</p>
                </div>
                <div className={styles.chartLegend}>
                  <span><i className={styles.legendDiscovered} />Found</span>
                  <span><i className={styles.legendMatched} />Matched</span>
                  <span><i className={styles.legendSent} />Sent</span>
                </div>
              </div>
              <div
                className={styles.weeklyChart}
                role="img"
                aria-label="Weekly discovery chart. Thursday had the highest volume with 21 listings found, 8 matched, and 3 sent."
              >
                <div className={styles.chartGridLines} aria-hidden="true">
                  <span /><span /><span /><span />
                </div>
                {weeklyTrend.map((day) => (
                  <div className={styles.dayColumn} key={day.day}>
                    <div className={styles.dayBars} aria-hidden="true">
                      <span
                        className={styles.discoveredBar}
                        style={{ height: `${(day.discovered / 21) * 100}%` }}
                        title={`${day.discovered} found`}
                      />
                      <span
                        className={styles.matchedBar}
                        style={{ height: `${(day.matched / 21) * 100}%` }}
                        title={`${day.matched} matched`}
                      />
                      <span
                        className={styles.sentBar}
                        style={{ height: `${Math.max((day.sent / 21) * 100, 2)}%` }}
                        title={`${day.sent} sent`}
                      />
                    </div>
                    <span>{day.day}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section id="review-queue" className={styles.queueSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionKicker}>Decision center</span>
                <h2>Application review queue</h2>
                <p>Open every prepared match before approving it.</p>
              </div>
              <span className={styles.queueSummary}>
                <Clock3 size={15} /> About 4 minutes to review
              </span>
            </div>

            <div className={styles.queueControls}>
              <div className={styles.tabs} role="tablist" aria-label="Queue status">
                {([
                  ["review", "Review", reviewCount],
                  ["ready", "Approved", readyCount],
                  ["history", "History", historyCount],
                ] as const).map(([tab, label, count]) => (
                  <button
                    type="button"
                    role="tab"
                    id={`queue-tab-${tab}`}
                    aria-controls="queue-panel"
                    aria-selected={queueTab === tab}
                    tabIndex={queueTab === tab ? 0 : -1}
                    className={queueTab === tab ? styles.tabActive : styles.tab}
                    key={tab}
                    onClick={() => setQueueTab(tab)}
                    onKeyDown={(event) => handleQueueTabKeyDown(event, tab)}
                  >
                    {label}
                    <span>{count}</span>
                  </button>
                ))}
              </div>
              <div className={styles.filters}>
                <label className={styles.searchField}>
                  <Search size={16} />
                  <span className={styles.visuallyHidden}>Search job matches</span>
                  <input
                    type="search"
                    placeholder="Search role, company, or skill"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <label className={styles.selectWrap}>
                  <span className={styles.visuallyHidden}>Filter by source</span>
                  <select
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                  >
                    <option>All sources</option>
                    {sourceOptions.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.selectWrap}>
                  <span className={styles.visuallyHidden}>Sort jobs</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option>Best match</option>
                    <option>Newest</option>
                  </select>
                </label>
              </div>
            </div>

            <div
              id="queue-panel"
              className={styles.jobList}
              role="tabpanel"
              aria-labelledby={`queue-tab-${queueTab}`}
            >
              {filteredJobs.length ? (
                filteredJobs.map((job) => (
                  <article className={styles.jobCard} key={job.id}>
                    <button
                      type="button"
                      className={styles.jobCardMain}
                      onClick={() => openJobReview(job.id)}
                      aria-label={`Review ${job.title} at ${job.company}`}
                    >
                      <ScoreBadge score={job.score} />
                      <div className={styles.jobIdentity}>
                        <div className={styles.jobTitleRow}>
                          <h3>{job.title}</h3>
                          <span className={`${styles.statusPill} ${styles[`status_${job.status}`]}`}>
                            {statusLabels[job.status]}
                          </span>
                        </div>
                        <strong>{job.company}</strong>
                        <div className={styles.jobMeta}>
                          <span><MapPin size={14} />{job.location}</span>
                          <span><BriefcaseBusiness size={14} />{job.workMode}</span>
                          <span><Clock3 size={14} />{job.posted}</span>
                        </div>
                        <div className={styles.skillRow}>
                          {job.skills.slice(0, 3).map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                          {job.skills.length > 3 ? <span>+{job.skills.length - 3}</span> : null}
                        </div>
                      </div>
                      <div className={styles.jobCompensation}>
                        <span>Listed pay</span>
                        <strong>{job.salary}</strong>
                        <small>{job.source}</small>
                      </div>
                      <ChevronRight className={styles.jobChevron} size={19} />
                    </button>
                    <div className={styles.jobCardActions}>
                      <button type="button" onClick={() => openJobReview(job.id)}>
                        Review details
                      </button>
                      {job.status === "review" ? (
                        <>
                          <button type="button" onClick={() => handleSkip(job)}>Skip</button>
                          <button
                            type="button"
                            className={styles.approveButton}
                            onClick={() => handleApprove(job)}
                          >
                            <Check size={15} /> Approve
                          </button>
                        </>
                      ) : job.status === "skipped" ? (
                        <button
                          type="button"
                          className={styles.approveButton}
                          onClick={() => handleReturnToReview(job)}
                        >
                          Return to review
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <Search size={22} />
                  <h3>No matches in this view</h3>
                  <p>Clear a filter or choose another queue tab.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSourceFilter("All sources");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>

          <section id="applications" className={styles.lowerGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>Audit trail</span>
                  <h2>Application activity</h2>
                  <p>A clear record of every demo workflow event.</p>
                </div>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    setQueueTab("history");
                    navigateTo("review-queue");
                  }}
                >
                  View history <ArrowUpRight size={15} />
                </button>
              </div>
              <div className={styles.activityList}>
                {activity.map((item) => (
                  <div className={styles.activityItem} key={item.id}>
                    <span className={`${styles.activityDot} ${styles[`dot_${item.tone}`]}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            </article>

            <article id="profile" className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>Readiness</span>
                  <h2>Application profile</h2>
                  <p>Coverage of the data used to prepare applications.</p>
                </div>
                <div className={styles.coverageScore}>89%</div>
              </div>
              <div className={styles.coverageList}>
                {profileCoverage.map((item) => (
                  <div className={styles.coverageItem} key={item.label}>
                    <div><span>{item.label}</span><strong>{item.value}%</strong></div>
                    <div className={styles.coverageTrack}>
                      <span style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link className={styles.profileAction} href="/setup">
                <UserRoundCheck size={17} /> Review saved answers <ArrowRight size={15} />
              </Link>
            </article>
          </section>

          <section id="sources" className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionKicker}>Acquisition</span>
                <h2>Source performance</h2>
                <p>Compare sample listing volume with strong-fit yield.</p>
              </div>
              <span className={styles.periodPill}>Last 7 days</span>
            </div>
            <div className={styles.sourceTable}>
              <div className={styles.sourceHeader}>
                <span>Source</span><span>Listings found</span><span>Strong matches</span><span>Match rate</span>
              </div>
              {sourcePerformance.map((source) => (
                <div className={styles.sourceRow} key={source.name}>
                  <strong>{source.name}</strong>
                  <span>{source.discovered}</span>
                  <span>{source.matched}</span>
                  <div className={styles.sourceRate}>
                    <div><span style={{ width: `${source.rate}%` }} /></div>
                    <strong>{source.rate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className={styles.footer}>
            <span>ApplyFlow portfolio demo</span>
            <div className={styles.footerActions}>
              <span>Sample data only - review-first automation</span>
              <button type="button" className={styles.resetButton} onClick={resetDemo}>
                <RotateCcw size={13} /> Reset demo
              </button>
            </div>
          </footer>
        </div>
      </main>

      {selectedJob ? (
        <div className={styles.drawerLayer}>
          <button
            type="button"
            className={styles.drawerScrim}
            onClick={() => setSelectedJobId(null)}
            aria-label="Close job review"
          />
          <aside
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-review-title"
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerKicker}>Review match</span>
                <span className={`${styles.statusPill} ${styles[`status_${selectedJob.status}`]}`}>
                  {statusLabels[selectedJob.status]}
                </span>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setSelectedJobId(null)}
                aria-label="Close job review"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.drawerBody}>
              <div className={styles.drawerTitle}>
                <ScoreBadge score={selectedJob.score} />
                <div>
                  <h2 id="job-review-title">{selectedJob.title}</h2>
                  <strong>{selectedJob.company}</strong>
                </div>
              </div>
              <div className={styles.drawerMetaGrid}>
                <div><MapPin size={15} /><span>Location<strong>{selectedJob.location}</strong></span></div>
                <div><BriefcaseBusiness size={15} /><span>Work setup<strong>{selectedJob.workMode}</strong></span></div>
                <div><Clock3 size={15} /><span>Posted<strong>{selectedJob.posted}</strong></span></div>
                <div><FileCheck2 size={15} /><span>Source<strong>{selectedJob.source}</strong></span></div>
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Listed compensation</span>
                <strong className={styles.salaryValue}>{selectedJob.salary}</strong>
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Role summary</span>
                <p>{selectedJob.summary}</p>
                <div className={styles.matchInsight}>
                  <Sparkles size={16} />
                  <div><strong>Why this matched</strong><span>{selectedJob.matchReason}</span></div>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Skills coverage</span>
                <div className={styles.coveredSkills}>
                  {selectedJob.skills.map((skill) => (
                    <span key={skill} className={selectedJob.matchedSkills.includes(skill) ? styles.skillMatched : styles.skillGap}>
                      {selectedJob.matchedSkills.includes(skill) ? <Check size={13} /> : null}{skill}
                    </span>
                  ))}
                </div>
                {selectedJob.gaps.length ? (
                  <div className={styles.gapList}>
                    {selectedJob.gaps.map((gap) => <span key={gap}>{gap}</span>)}
                  </div>
                ) : null}
              </div>

              <div className={styles.drawerSection}>
                <span className={styles.drawerSectionLabel}>Application pack</span>
                <div className={styles.packCard}>
                  <div><FileText size={17} /><span>Resume<strong>{selectedJob.resume}</strong></span></div>
                  <CheckCircle2 size={17} className={styles.checkIcon} />
                </div>
                <div className={styles.packCard}>
                  <div><WandSparkles size={17} /><span>Cover letter<strong>{selectedCoverLetterStatus}</strong></span></div>
                  {selectedJobMissingAnswers === 0 ? (
                    <CheckCircle2 size={17} className={styles.checkIcon} />
                  ) : (
                    <CirclePause size={17} className={styles.warningIcon} />
                  )}
                </div>
              </div>

              {selectedJob.screening.length ? (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Screening answers</span>
                  <div className={styles.screeningList}>
                    {selectedJob.screening.map((answer) => {
                      const overrideKey = `${selectedJob.id}:${answer.label}`;
                      const complete = answer.complete || answeredFields[overrideKey];
                      return (
                        <button
                          type="button"
                          key={answer.label}
                          className={styles.screeningRow}
                          onClick={() => !answer.complete && toggleAnswered(selectedJob.id, answer.label)}
                          disabled={answer.complete}
                          aria-pressed={answer.complete ? undefined : Boolean(complete)}
                        >
                          <span className={complete ? styles.answerCheck : styles.answerMissing}>
                            {complete ? <Check size={13} /> : <CirclePause size={13} />}
                          </span>
                          <span><strong>{answer.label}</strong><small>{complete && !answer.complete ? "Added for demo review" : answer.value}</small></span>
                          {!answer.complete ? <span className={styles.answerAction}>{complete ? "Undo" : "Add answer"}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles.drawerFooter}>
              <p><ShieldCheck size={14} /> Nothing leaves this demo without your approval.</p>
              <div>
                {selectedJob.status === "sent" || selectedJob.status === "skipped" ? (
                  <button
                    type="button"
                    className={styles.drawerSkip}
                    onClick={() => setSelectedJobId(null)}
                  >
                    Close
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.drawerSkip}
                    onClick={() => handleSkip(selectedJob)}
                  >
                    Skip match
                  </button>
                )}
                {selectedJob.status === "ready" ? (
                  <button
                    type="button"
                    className={styles.drawerApprove}
                    onClick={() => handleMarkSent(selectedJob)}
                  >
                    <Send size={16} /> Mark as sent
                  </button>
                ) : selectedJob.status === "sent" ? (
                  <button type="button" className={styles.drawerApprove} disabled>
                    <Check size={16} /> Sent
                  </button>
                ) : selectedJob.status === "skipped" ? (
                  <button
                    type="button"
                    className={styles.drawerApprove}
                    onClick={() => handleReturnToReview(selectedJob)}
                  >
                    Return to review
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.drawerApprove}
                    onClick={() => handleApprove(selectedJob)}
                    disabled={selectedJobMissingAnswers > 0}
                    title={
                      selectedJobMissingAnswers > 0
                        ? "Complete the missing screening answer first"
                        : undefined
                    }
                  >
                    {selectedJobMissingAnswers > 0 ? (
                      <CirclePause size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    {selectedJobMissingAnswers > 0
                      ? `Complete ${selectedJobMissingAnswers} ${selectedJobMissingAnswers === 1 ? "answer" : "answers"}`
                      : "Approve and queue"}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status" aria-live="polite">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  );
}
