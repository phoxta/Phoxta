import React, { useState, useEffect, useMemo } from 'react';
import { ApplicationStatus, BaseCV, ConnectedAccount, EmailScanResult, JobApplication, JobSource, PriorityLevel } from './types';
import { INITIAL_APPLICATIONS, INITIAL_CONNECTED_ACCOUNTS, INITIAL_BASE_CVS, DEMO_INCOMING_EMAILS } from './data/initialData';
import { NotionTopNav } from './components/NotionTopNav';
import { NotionHeader } from './components/NotionHeader';
import { NotionViewTabs, ViewType } from './components/NotionViewTabs';
import { BoardView } from './components/BoardView';
import { TableView } from './components/TableView';
import { CalendarView } from './components/CalendarView';
import { EmailSyncHub } from './components/EmailSyncHub';
import { AnalyticsView } from './components/AnalyticsView';
import { CVVaultView } from './components/CVVaultView';
import { NotionSidePeek } from './components/NotionSidePeek';
import { NewApplicationModal } from './components/NewApplicationModal';
import { AccessCodeAuth, ACCESS_AUTH_STORAGE_KEY } from './components/AccessCodeAuth';
import { triggerOfferConfetti } from './utils/notionStyles';
import {
  saveApplicationToFirestore,
  deleteApplicationFromFirestore,
  saveAllApplicationsToFirestore,
  saveConnectedAccountToFirestore,
  deleteConnectedAccountFromFirestore,
  saveBaseCVToFirestore,
  deleteBaseCVFromFirestore,
  subscribeToApplications,
  subscribeToConnectedAccounts,
  subscribeToBaseCVs,
  testFirestoreConnection,
  purgeLegacyDemoData,
  clearAllApplicationsFromFirestore,
} from './lib/cloud';

const STORAGE_KEY = 'notion_job_tracker_apps_v2';
const EMAIL_QUEUE_KEY = 'notion_job_tracker_emails_v2';
const ACCOUNTS_STORAGE_KEY = 'notion_job_tracker_accounts_v2';
const CVS_STORAGE_KEY = 'notion_job_tracker_cvs_v2';

export default function App() {
  // Applications state
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return INITIAL_APPLICATIONS;
  });

  // Base CVs / Resumes state (multi-CV for different roles)
  const [baseCvs, setBaseCvs] = useState<BaseCV[]>(() => {
    try {
      const saved = localStorage.getItem(CVS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read CVs from localStorage:', e);
    }
    return INITIAL_BASE_CVS;
  });

  // Connected email accounts state (multi-account)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read accounts from localStorage:', e);
    }
    return INITIAL_CONNECTED_ACCOUNTS;
  });

  // Incoming scanned emails queue
  const [incomingEmails, setIncomingEmails] = useState<EmailScanResult[]>(() => {
    try {
      const saved = localStorage.getItem(EMAIL_QUEUE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read email queue:', e);
    }
    return DEMO_INCOMING_EMAILS;
  });

  // Cloud status
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  // Access code authentication state ("082900")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(ACCESS_AUTH_STORAGE_KEY) === 'true' ||
        sessionStorage.getItem(ACCESS_AUTH_STORAGE_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });

  const handleLockWorkspace = () => {
    try {
      localStorage.removeItem(ACCESS_AUTH_STORAGE_KEY);
      sessionStorage.removeItem(ACCESS_AUTH_STORAGE_KEY);
    } catch {}
    setIsAuthenticated(false);
  };

  // Active view
  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<JobSource | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'All'>('All');
  const [sortBy, setSortBy] = useState<'dateApplied' | 'company' | 'priority' | 'nextStep'>('dateApplied');

  // 1. Firebase Firestore real-time synchronization for Applications, Accounts & Base CVs
  useEffect(() => {
    let unsubscribeApps: () => void = () => {};
    let unsubscribeAccounts: () => void = () => {};
    let unsubscribeCVs: () => void = () => {};

    testFirestoreConnection().then((connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        purgeLegacyDemoData().catch(() => {});
      }
    });

    try {
      unsubscribeApps = subscribeToApplications(
        (remoteApps) => {
          // Filter out legacy dummy apps if any are returned
          const filtered = (remoteApps || []).filter(
            (app) => !['app-1', 'app-2', 'app-3', 'app-4', 'app-5', 'app-6'].includes(app.id)
          );
          setApplications(filtered);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        },
        (err) => console.warn('Firestore apps sync issue:', err)
      );

      unsubscribeAccounts = subscribeToConnectedAccounts(
        (remoteAccounts) => {
          const filtered = (remoteAccounts || []).filter(
            (acc) => !['acc-1', 'acc-2'].includes(acc.id)
          );
          // No dummy seed — accounts appear only after a real Gmail is connected
          // via OAuth (which writes the account row server-side).
          setConnectedAccounts(filtered);
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
        },
        (err) => console.warn('Firestore accounts sync issue:', err)
      );

      unsubscribeCVs = subscribeToBaseCVs(
        (remoteCVs) => {
          if (remoteCVs && remoteCVs.length > 0) {
            setBaseCvs(remoteCVs);
            localStorage.setItem(CVS_STORAGE_KEY, JSON.stringify(remoteCVs));
          } else {
            // Seed initial base CVs into Firestore
            INITIAL_BASE_CVS.forEach((cv) => {
              saveBaseCVToFirestore(cv).catch((err) =>
                console.warn('Auto-seed base CV error:', err)
              );
            });
          }
        },
        (err) => console.warn('Firestore CVs sync issue:', err)
      );
    } catch (e) {
      console.warn('Could not initialize Firestore subscriptions:', e);
    }

    return () => {
      unsubscribeApps();
      unsubscribeAccounts();
      unsubscribeCVs();
    };
  }, []);

  // Local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(CVS_STORAGE_KEY, JSON.stringify(baseCvs));
    } catch (e) {
      console.warn('Failed to save CVs to localStorage:', e);
    }
  }, [baseCvs]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(connectedAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [connectedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(incomingEmails));
    } catch (e) {
      console.warn('Failed to save email queue:', e);
    }
  }, [incomingEmails]);

  // CV Handlers
  const handleSaveCV = (cv: BaseCV) => {
    setBaseCvs((prev) => {
      const idx = prev.findIndex((c) => c.id === cv.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cv;
        return next;
      }
      return [cv, ...prev];
    });
    saveBaseCVToFirestore(cv).catch((err) => console.warn('Firestore save CV error:', err));
  };

  const handleDeleteCV = (cvId: string) => {
    setBaseCvs((prev) => prev.filter((c) => c.id !== cvId));
    deleteBaseCVFromFirestore(cvId).catch((err) => console.warn('Firestore delete CV error:', err));
  };

  // Local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(connectedAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [connectedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(incomingEmails));
    } catch (e) {
      console.warn('Failed to save email queue:', e);
    }
  }, [incomingEmails]);

  // Update status handler
  const handleUpdateStatus = (id: string, newStatus: ApplicationStatus) => {
    const target = applications.find((a) => a.id === id);
    if (!target) return;

    const updatedApp: JobApplication = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? updatedApp : app))
    );

    if (selectedApplication && selectedApplication.id === id) {
      setSelectedApplication(updatedApp);
    }

    // Persist directly to Firebase Firestore
    saveApplicationToFirestore(updatedApp).catch((err) =>
      console.warn('Firestore status update error:', err)
    );
  };

  // Quick add from board column
  const handleQuickAdd = (status: ApplicationStatus, title: string) => {
    const parts = title.split(' - ');
    const company = parts[0]?.trim() || 'New Company';
    const role = parts[1]?.trim() || (parts[0]?.trim() ? `${parts[0].trim()} Role` : 'Target Position');

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      company: company || 'New Company',
      role: role || 'Target Position',
      status,
      location: 'Remote',
      workType: 'Remote',
      source: 'Indeed',
      dateApplied: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      notes: '',
      linkedEmails: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);
    saveApplicationToFirestore(newApp).catch((err) =>
      console.warn('Firestore quick add error:', err)
    );
  };

  // Add full application from modal — with de-duplication so the same job isn't
  // tracked twice (same job URL, or same company + role). If it's already there,
  // open the existing one instead of creating a duplicate.
  const handleAddApplication = (newApp: JobApplication) => {
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const dup = applications.find((a) =>
      (!!newApp.jobUrl && norm(a.jobUrl) === norm(newApp.jobUrl)) ||
      (norm(a.company) !== '' && norm(a.company) === norm(newApp.company) && norm(a.role) === norm(newApp.role))
    );
    if (dup) {
      setSelectedApplication(dup);
      return;
    }
    setApplications((prev) => [newApp, ...prev]);
    saveApplicationToFirestore(newApp).catch((err) =>
      console.warn('Supabase add application error:', err)
    );
  };

  // Update existing application
  const handleUpdateApplication = (updated: JobApplication) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updated.id ? updated : app))
    );
    setSelectedApplication(updated);
    saveApplicationToFirestore(updated).catch((err) =>
      console.warn('Firestore update error:', err)
    );
  };

  // Delete application
  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedApplication && selectedApplication.id === id) {
      setSelectedApplication(null);
    }
    deleteApplicationFromFirestore(id).catch((err) =>
      console.warn('Firestore delete error:', err)
    );
  };

  // Connected accounts handlers
  const handleAddAccount = (account: ConnectedAccount) => {
    setConnectedAccounts((prev) => [account, ...prev]);
    saveConnectedAccountToFirestore(account).catch((err) =>
      console.warn('Firestore add account error:', err)
    );
  };

  const handleDeleteAccount = (accountId: string) => {
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
    deleteConnectedAccountFromFirestore(accountId).catch((err) =>
      console.warn('Firestore delete account error:', err)
    );
  };

  // Purge junk dummy applications (e.g. old "Target Company" or "Helping Hands" placeholders)
  const handlePurgeJunkApplications = () => {
    const junkCompNames = ['target company', 'helping hands', 'unknown', 'hiring organization', 'company'];
    const junkIds: string[] = [];

    setApplications((prev) =>
      prev.filter((app) => {
        const compLower = (app.company || '').trim().toLowerCase();
        const isJunk = !compLower || junkCompNames.includes(compLower);
        if (isJunk) {
          junkIds.push(app.id);
          deleteApplicationFromFirestore(app.id).catch((err) =>
            console.warn('Firestore delete junk application error:', err)
          );
          return false;
        }
        return true;
      })
    );

    // Also clear incoming queue of dummy entries
    setIncomingEmails((prev) =>
      prev.filter((item) => {
        const compLower = (item.parsedData?.company || '').trim().toLowerCase();
        return !junkCompNames.includes(compLower);
      })
    );
  };

  // Apply parsed email update with rich online intelligence
  const handleApplyEmailUpdate = (emailResult: EmailScanResult) => {
    const { parsedData } = emailResult;
    const enrichment = parsedData.onlineEnrichment;

    const parsedComp = (parsedData.company || '').trim().toLowerCase();
    const isGenericCompany = !parsedComp || ['target company', 'company', 'unknown', 'hiring organization', 'helping hands'].includes(parsedComp);

    // Check if matched application exists (strict company comparison)
    const existingIndex = isGenericCompany
      ? -1
      : applications.findIndex((a) => {
          const aComp = (a.company || '').trim().toLowerCase();
          if (!aComp || ['target company', 'company', 'unknown', 'hiring organization', 'helping hands'].includes(aComp)) return false;
          return aComp === parsedComp;
        });

    const sourceKey = (parsedData.source.toLowerCase().includes('indeed')
      ? 'indeed'
      : parsedData.source.toLowerCase().includes('linkedin')
      ? 'linkedin'
      : parsedData.source.toLowerCase().includes('greenhouse')
      ? 'greenhouse'
      : parsedData.source.toLowerCase().includes('lever')
      ? 'lever'
      : parsedData.source.toLowerCase().includes('workday')
      ? 'workday'
      : parsedData.source.toLowerCase().includes('ashby')
      ? 'ashby'
      : 'direct') as any;

    const detectedStatus = (parsedData.detectedStatus || (parsedData as any).status || 'Applied') as ApplicationStatus;

    const newLinkedEmail = {
      id: emailResult.id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      sender: emailResult.sender,
      subject: emailResult.subject,
      snippet: emailResult.snippet,
      fullBody: emailResult.fullBody,
      sourceType: sourceKey,
      detectedStatus: detectedStatus,
      aiSummary: parsedData.summary,
      actionRequired: parsedData.nextStep,
      extractedInterviewDate: parsedData.interviewDate,
    };

    if (existingIndex !== -1) {
      // Update existing application
      const existing = applications[existingIndex];
      const updated: JobApplication = {
        ...existing,
        status: detectedStatus || existing.status,
        salary: parsedData.salary || enrichment?.estimatedSalaryRange || existing.salary,
        location: parsedData.location || existing.location,
        workType: parsedData.workType || existing.workType,
        contactName: parsedData.recruiterName || existing.contactName,
        contactEmail: parsedData.recruiterEmail || existing.contactEmail,
        contactRole: parsedData.recruiterRole || existing.contactRole,
        contactLinkedin: parsedData.recruiterLinkedin || existing.contactLinkedin,
        companyWebsite: parsedData.companyWebsite || enrichment?.companyWebsite || existing.companyWebsite,
        companyCareersUrl: parsedData.companyCareersUrl || enrichment?.companyCareersUrl || existing.companyCareersUrl,
        jobUrl: parsedData.jobUrl || existing.jobUrl,
        nextStepTitle: parsedData.nextStep || existing.nextStepTitle,
        nextStepDate: parsedData.interviewDate || existing.nextStepDate,
        linkedEmails: [newLinkedEmail, ...(existing.linkedEmails || [])],
        updatedAt: new Date().toISOString(),
      };

      setApplications((prev) =>
        prev.map((a, idx) => (idx === existingIndex ? updated : a))
      );
      saveApplicationToFirestore(updated).catch((err) =>
        console.warn('Firestore update error:', err)
      );
    } else {
      // Create new application
      const newApp: JobApplication = {
        id: `app-${Date.now()}`,
        company: parsedData.company,
        role: parsedData.role || 'Position Applied',
        status: detectedStatus,
        salary: parsedData.salary || enrichment?.estimatedSalaryRange || '',
        location: parsedData.location || 'Remote',
        workType: parsedData.workType || 'Remote',
        source: parsedData.source || 'Indeed',
        contactName: parsedData.recruiterName,
        contactEmail: parsedData.recruiterEmail,
        contactRole: parsedData.recruiterRole,
        contactLinkedin: parsedData.recruiterLinkedin,
        companyWebsite: parsedData.companyWebsite || enrichment?.companyWebsite,
        companyCareersUrl: parsedData.companyCareersUrl || enrichment?.companyCareersUrl,
        jobUrl: parsedData.jobUrl,
        dateApplied: new Date().toISOString().split('T')[0],
        nextStepTitle: parsedData.nextStep,
        nextStepDate: parsedData.interviewDate,
        priority: 'High',
        notes: `Imported via Email Sync (${parsedData.source}).\n${parsedData.summary}${
          enrichment?.companyOverview ? `\n\nCompany Overview: ${enrichment.companyOverview}` : ''
        }`,
        linkedEmails: [newLinkedEmail],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setApplications((prev) => [newApp, ...prev]);
      saveApplicationToFirestore(newApp).catch((err) =>
        console.warn('Firestore save application error:', err)
      );
    }

    // Remove from incoming queue
    setIncomingEmails((prev) => prev.filter((e) => e.id !== emailResult.id));
  };

  // Dismiss incoming email
  const handleDismissEmail = (emailId: string) => {
    setIncomingEmails((prev) => prev.filter((e) => e.id !== emailId));
  };

  // Add new parsed email to queue
  const handleManualEmailParsed = (emailResult: EmailScanResult) => {
    setIncomingEmails((prev) => [emailResult, ...prev]);
  };

  // Accept all pending email updates
  const handleSyncAllPending = () => {
    incomingEmails.forEach((item) => handleApplyEmailUpdate(item));
    triggerOfferConfetti();
  };

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            app.company.toLowerCase().includes(q) ||
            app.role.toLowerCase().includes(q) ||
            app.location.toLowerCase().includes(q) ||
            app.source.toLowerCase().includes(q) ||
            app.notes.toLowerCase().includes(q) ||
            (app.tags && app.tags.some((t) => t.toLowerCase().includes(q)));
          if (!matches) return false;
        }

        // Status filter
        if (statusFilter !== 'All' && app.status !== statusFilter) return false;

        // Source filter
        if (sourceFilter !== 'All' && app.source !== sourceFilter) return false;

        // Priority filter
        if (priorityFilter !== 'All' && app.priority !== priorityFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'company') {
          return a.company.localeCompare(b.company);
        } else if (sortBy === 'priority') {
          const pOrder = { High: 3, Medium: 2, Low: 1 };
          return pOrder[b.priority] - pOrder[a.priority];
        } else if (sortBy === 'nextStep') {
          return (b.nextStepDate || '').localeCompare(a.nextStepDate || '');
        } else {
          return (b.dateApplied || '').localeCompare(a.dateApplied || '');
        }
      });
  }, [applications, searchQuery, statusFilter, sourceFilter, priorityFilter, sortBy]);

  return (
    <div className="min-h-screen bg-white text-[#37352F] flex flex-col selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Sticky Notion Top Bar */}
      <NotionTopNav
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenEmailSync={() => setCurrentView('emails')}
        unreadEmailUpdatesCount={incomingEmails.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isStarred={isStarred}
        onToggleStar={() => setIsStarred(!isStarred)}
        isFirebaseConnected={isFirebaseConnected}
        connectedAccountsCount={connectedAccounts.length}
        onLock={handleLockWorkspace}
      />

      {/* Notion Page Cover & Icon Header */}
      <NotionHeader
        applications={applications}
        onOpenEmailSync={() => setCurrentView('emails')}
        onOpenNewModal={() => setIsNewModalOpen(true)}
      />

      {/* Notion Database Views Tab Bar & Filters */}
      <NotionViewTabs
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredApplications.length}
        cvCount={baseCvs.length}
      />

      {/* Overdue follow-ups nudge — uses the nextStepDate you already track. */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const overdue = applications.filter(
          (a) => a.nextStepDate && a.nextStepDate < todayStr &&
            a.status !== 'Offer' && a.status !== 'Rejected' && a.status !== 'Withdrawn'
        );
        if (overdue.length === 0) return null;
        const names = overdue.slice(0, 4).map((a) => a.company).join(', ');
        return (
          <div className="px-4 sm:px-6 lg:px-8 pt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span className="font-semibold">{overdue.length} follow-up{overdue.length > 1 ? 's' : ''} overdue</span>
              <span className="text-amber-700">— {names}{overdue.length > 4 ? ` +${overdue.length - 4} more` : ''}</span>
            </div>
          </div>
        );
      })()}

      {/* Main View Area */}
      <main className="flex-1 w-full pb-16">
        {currentView === 'board' && (
          <BoardView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
            onUpdateStatus={handleUpdateStatus}
            onQuickAdd={handleQuickAdd}
            onDeleteApplication={handleDeleteApplication}
          />
        )}

        {currentView === 'table' && (
          <TableView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
            onUpdateStatus={handleUpdateStatus}
            onDeleteApplication={handleDeleteApplication}
            onOpenNewModal={() => setIsNewModalOpen(true)}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
          />
        )}

        {currentView === 'emails' && (
          <EmailSyncHub
            applications={applications}
            incomingEmails={incomingEmails}
            connectedAccounts={connectedAccounts}
            onApplyEmailUpdate={handleApplyEmailUpdate}
            onDismissEmail={handleDismissEmail}
            onManualEmailParsed={handleManualEmailParsed}
            onSyncAllPending={handleSyncAllPending}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
            onPurgeJunkApplications={handlePurgeJunkApplications}
            isFirebaseConnected={isFirebaseConnected}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            applications={applications}
            baseCvs={baseCvs}
            onSelectApplication={setSelectedApplication}
          />
        )}

        {currentView === 'cvs' && (
          <CVVaultView
            baseCvs={baseCvs}
            applications={applications}
            onSaveCV={handleSaveCV}
            onDeleteCV={handleDeleteCV}
            onOpenApplication={(app) => setSelectedApplication(app)}
          />
        )}
      </main>

      {/* Notion Side Peek Drawer / Modal */}
      {selectedApplication && (
        <NotionSidePeek
          application={selectedApplication}
          baseCvs={baseCvs}
          onClose={() => setSelectedApplication(null)}
          onUpdate={handleUpdateApplication}
          onDelete={handleDeleteApplication}
        />
      )}

      {/* New Application Creation Modal */}
      <NewApplicationModal
        isOpen={isNewModalOpen}
        baseCvs={baseCvs}
        onClose={() => setIsNewModalOpen(false)}
        onAdd={handleAddApplication}
      />

      {/* Access Code Passcode Lock Gate */}
      {!isAuthenticated && (
        <AccessCodeAuth
          correctCode="082900"
          onSuccess={() => setIsAuthenticated(true)}
        />
      )}
    </div>
  );
}
