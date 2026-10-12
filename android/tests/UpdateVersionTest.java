import com.qiumu.reallifeenglish.UpdateVersion;
public class UpdateVersionTest {
    public static void main(String[] args) {
        if (!UpdateVersion.isNewer("v1.1.0", "1.0.0")) throw new AssertionError();
        if (!UpdateVersion.isNewer("v1.10.0", "1.9.0")) throw new AssertionError();
        if (UpdateVersion.isNewer("v1.1.0", "1.1.0")) throw new AssertionError();
        if (UpdateVersion.isNewer("v1.0.0", "1.1.0")) throw new AssertionError();
        try { UpdateVersion.isNewer("v1.2.0-beta", "1.1.0"); throw new AssertionError(); }
        catch (IllegalArgumentException expected) {}
        System.out.println("Update version comparison: OK");
    }
}
