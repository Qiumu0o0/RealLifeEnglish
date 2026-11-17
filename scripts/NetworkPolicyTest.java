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
        check(NetworkPolicy.allowsExternalColes("https", "www.coles.com.au", -1));
        check(NetworkPolicy.allowsExternalColes("https", "www.coles.com.au", 443));
        check(!NetworkPolicy.allowsExternalColes("http", "www.coles.com.au", -1));
        check(!NetworkPolicy.allowsExternalColes("https", "coles.com.au.evil.test", -1));
        check(!NetworkPolicy.allowsExternalColes("https", "www.coles.com.au", 444));
        System.out.println("Cloud API and external Coles HTTPS allowlists: OK");
    }
}
