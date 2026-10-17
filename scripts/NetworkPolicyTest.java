package com.qiumu.reallifeenglish;

public class NetworkPolicyTest {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) {
        String host = "zlcgkmjlswfkfjzlbknk.supabase.co";
        check(NetworkPolicy.allowsCloud("https", host, -1, "/auth/v1/token"));
        check(NetworkPolicy.allowsCloud("https", host, 443, "/rest/v1/rpc/sync_progress"));
        check(!NetworkPolicy.allowsCloud("http", host, -1, "/auth/v1/token"));
        check(!NetworkPolicy.allowsCloud("https", host + ".evil.test", -1, "/auth/v1/token"));
        check(!NetworkPolicy.allowsCloud("https", "other.supabase.co", -1, "/auth/v1/token"));
        check(!NetworkPolicy.allowsCloud("https", host, 444, "/auth/v1/token"));
        check(!NetworkPolicy.allowsCloud("https", host, -1, "/storage/v1/object"));
        check(!NetworkPolicy.allowsCloud(null, null, -1, null));
        System.out.println("Cloud HTTPS allowlist: allowed APIs and blocked host/scheme/port/path tests OK");
    }
}
