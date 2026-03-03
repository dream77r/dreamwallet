import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query'
import superjson from 'superjson'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes instead of 30 seconds to speed up navigation
        staleTime: 5 * 60 * 1000,
        // Keep inactive cache data around for 30 minutes
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1, // Only retry once to fail faster on genuine errors
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  })
}
