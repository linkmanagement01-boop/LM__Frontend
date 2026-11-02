import React from 'react';
import { TrafficSuggestionsPage } from '../../../components/TrafficSuggestions';

/** Sites → Suggestions: growing rejected sites + automatic rejections from Ahrefs checks */
export function SiteSuggestions() {
  return <TrafficSuggestionsPage role="admin" />;
}

export default SiteSuggestions;
