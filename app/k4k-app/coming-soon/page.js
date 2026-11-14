// This route used to re-export the launch page, so the same page was served at
// three URLs (/, /k4k-app and /k4k-app/coming-soon) with no canonical. Existing
// links are kept working by redirecting instead, so search engines index one URL
// and no visitor lands on a "coming soon" address now that the site is live.
import {permanentRedirect} from 'next/navigation';

export default function ComingSoon(){permanentRedirect('/')}
