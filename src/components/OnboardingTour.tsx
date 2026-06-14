'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface OnboardingTourProps {
  userId: string;
  role: 'Admin' | 'Worker';
}

const tourKey = (userId: string) => `hoath_tour_done_${userId}`;

export default function OnboardingTour({ userId, role }: OnboardingTourProps) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !userId) return;
    if (localStorage.getItem(tourKey(userId))) return;

    const timer = setTimeout(() => {
      started.current = true;
      const isMobile = window.innerWidth < 768;

      const adminSteps = [
        {
          element: '#tour-sidebar-header',
          popover: {
            title: 'Welcome to House of Oath Studio',
            description: "You're all set up! Let's take a quick tour of your workspace.",
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: '#tour-search',
          popover: {
            title: 'Search Clients',
            description: 'Find any client by name, phone number, event, package, or status.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: '#tour-client-tabs',
          popover: {
            title: 'Status Filters',
            description: 'Filter your list: All clients, Due Soon (upcoming deliveries), or Finished orders.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        ...(!isMobile
          ? [
              {
                element: '#tour-options-menu',
                popover: {
                  title: 'Settings & Team',
                  description:
                    'Manage your team from here. Add tailors, archive them, or view the full activity log.',
                  side: 'right' as const,
                  align: 'start' as const,
                },
              },
            ]
          : []),
        {
          element: '#tour-fab',
          popover: {
            title: 'Add a New Client',
            description:
              'Tap here to register a new client order: measurements, event date, and tailor assignment.',
            side: 'left' as const,
            align: 'end' as const,
          },
        },
        {
          element: '#tour-profile-card',
          popover: {
            title: 'Your Profile',
            description: "Update your name, photo, or password here. Enjoy the studio!",
            side: 'top' as const,
            align: 'start' as const,
          },
        },
      ];

      const workerSteps = [
        {
          element: '#tour-sidebar-header',
          popover: {
            title: 'Welcome to House of Oath Studio',
            description: "Clients assigned to you by your Admin appear here. Let's take a quick look.",
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: '#tour-search',
          popover: {
            title: 'Search Clients',
            description: 'Find your clients quickly by name, event month, or phone number.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: '#tour-client-tabs',
          popover: {
            title: 'Status Filters',
            description: 'Switch between All clients, Due Soon orders, and Finished work.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
        {
          element: '#tour-profile-card',
          popover: {
            title: 'Your Profile',
            description:
              'Set or update your password here. We recommend doing this on your very first login.',
            side: 'top' as const,
            align: 'start' as const,
          },
        },
      ];

      const steps = role === 'Admin' ? adminSteps : workerSteps;
      const validSteps = steps.filter(s => !s.element || !!document.querySelector(s.element));
      if (validSteps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done',
        progressText: '{{current}} of {{total}}',
        steps: validSteps,
        onDestroyStarted: () => {
          localStorage.setItem(tourKey(userId), '1');
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 700);

    return () => clearTimeout(timer);
  }, [userId, role]);

  return null;
}
