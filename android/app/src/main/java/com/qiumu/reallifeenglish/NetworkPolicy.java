package com.qiumu.reallifeenglish;

/** Narrow exception for this project's authentication and progress APIs. */
final class NetworkPolicy {
    static boolean allowsCloud(String scheme, String host, int port, String path) {
        return "https".equalsIgnoreCase(scheme)
                && "zlcgkmjlswfkfjzlbknk.supabase.co".equalsIgnoreCase(host)
                && (port == -1 || port == 443)
                && path != null
                && (path.startsWith("/auth/v1/") || path.startsWith("/rest/v1/"));
    }
}
