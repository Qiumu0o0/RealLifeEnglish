package com.qiumu.reallifeenglish;

public final class UpdateVersion {
    public static boolean isNewer(String remote, String local) {
        int[] next = parse(remote), current = parse(local);
        for (int i = 0; i < 3; i++) {
            if (next[i] != current[i]) return next[i] > current[i];
        }
        return false;
    }
    private static int[] parse(String value) {
        if (!value.matches("v?\\d+\\.\\d+\\.\\d+")) throw new IllegalArgumentException("Invalid version");
        String[] parts = value.replaceFirst("^v", "").split("\\.");
        return new int[]{Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2])};
    }
}
