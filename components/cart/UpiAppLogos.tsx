"use client";

import * as React from "react";

export function GPayLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M44.5 20H24V28.5H35.8C34.7 33.4 30.1 37 24 37C16.8 37 11 31.2 11 24C11 16.8 16.8 11 24 11C27.2 11 30.1 12.2 32.3 14.1L38.6 7.8C34.7 4.2 29.7 2 24 2C11.8 2 2 11.8 2 24C2 36.2 11.8 46 24 46C36.2 46 45 36.6 45 24C45 22.7 44.8 21.3 44.5 20Z"
        fill="#FFC107"
      />
      <path
        d="M4.3 14.7L11.7 20.1C13.7 14.8 18.4 11 24 11C27.2 11 30.1 12.2 32.3 14.1L38.6 7.8C34.7 4.2 29.7 2 24 2C15.4 2 8.1 7.2 4.3 14.7Z"
        fill="#FF3D00"
      />
      <path
        d="M24 46C29.5 46 34.4 43.9 38.2 40.5L31.2 34.9C29.2 36.3 26.7 37 24 37C18 37 13.4 33.5 11.4 28.7L4 34.4C7.8 41.5 15.3 46 24 46Z"
        fill="#4CAF50"
      />
      <path
        d="M44.5 20H24V28.5H35.8C35.2 30.9 33.5 33.2 31.2 34.9L38.2 40.5C42.4 36.6 45 30.9 45 24C45 22.7 44.8 21.3 44.5 20Z"
        fill="#1976D2"
      />
    </svg>
  );
}

export function PhonePeLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#5F259F" />
      <path
        d="M33 17H21C18.2 17 16 19.2 16 22V36H21V28H27.5C31.6 28 35 24.6 35 20.5V17H33ZM27.5 24H21V21H27.5C28.3 21 29 21.7 29 22.5C29 23.3 28.3 24 27.5 24Z"
        fill="white"
      />
      <path d="M23 13V17H28V13H23Z" fill="white" />
    </svg>
  );
}

export function PaytmLogo({ className = "w-7 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 76 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.8 4.2H0V21.5H5.8V15.2H8.9C13 15.2 15.8 12.8 15.8 9.7C15.8 6.6 13 4.2 8.9 4.2H5.8ZM8.5 10.9H5.8V8.5H8.5C9.8 8.5 10.5 9.1 10.5 9.7C10.5 10.3 9.8 10.9 8.5 10.9Z"
        fill="#002E6E"
      />
      <path
        d="M23.1 9.4C20.6 9.4 19.1 10.7 18.5 11.8V9.7H13.6V21.5H18.8V15.7C18.8 14.2 19.7 13.4 20.9 13.4C22.1 13.4 22.9 14.1 22.9 15.6V21.5H28.1V14.8C28.1 11.5 26.1 9.4 23.1 9.4Z"
        fill="#002E6E"
      />
      <path
        d="M34.7 17.5L31.6 9.7H26.3L32.1 22.2L28.7 26H34.1L40.1 9.7H34.9L34.7 17.5Z"
        fill="#002E6E"
      />
      <path
        d="M48.8 4.2H43.6V9.7H40.2V13.8H43.6V21.5H48.8V13.8H53.5V9.7H48.8V4.2Z"
        fill="#00BAF2"
      />
      <path
        d="M68.5 9.4C66.3 9.4 64.9 10.5 64.2 11.5C63.6 10.3 62.1 9.4 60.1 9.4C58 9.4 56.6 10.6 56 11.7V9.7H51.2V21.5H56.4V15.7C56.4 14.2 57.3 13.4 58.4 13.4C59.5 13.4 60.2 14.1 60.2 15.6V21.5H65.4V15.7C65.4 14.2 66.3 13.4 67.4 13.4C68.5 13.4 69.2 14.1 69.2 15.6V21.5H74.4V14.8C74.4 11.4 72.1 9.4 68.5 9.4Z"
        fill="#00BAF2"
      />
    </svg>
  );
}

export function GenericUpiLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0B6E4F" />
      <path d="M28.5 12L15 26.5H23.5L19.5 36L33 21.5H24.5L28.5 12Z" fill="#00C853" />
      <path d="M24 16L18 24H23L20 32L30 20H25L28 16H24Z" fill="white" />
    </svg>
  );
}
