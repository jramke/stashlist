<script>
    import { account } from '$lib/db/client';
    import { user } from '$lib/db/user';

    let loggedInUser = null;

    // async function login(email, password) {
    //     await account.createEmailSession(email, password);
    //     loggedInUser = await account.get();
    // }

    // async function register(email, password) {
    //     await account.create(ID.unique(), email, password);
    //     login(email, password);
    // }

    async function submit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const type = e.submitter.dataset.type;
        
        if (type === "login") {
            await user.login(formData.get('email'), formData.get('password'));
        } else if (type === "register") {
            await user.register(formData.get('email'), formData.get('password'));
        }
    }

    async function logout() {
        await account.deleteSession('current');
        loggedInUser = null;
    }
</script>

<p>
    {loggedInUser ? `Logged in as ${loggedInUser.name}` : 'Not logged in'}
</p>

<form on:submit={submit}>
    <input type="email" placeholder="Email" name="email" required />
    <input type="password" placeholder="Password" name="password" required />

    <button type="submit" data-type="login">Login</button>
    <button type="submit" data-type="register">Register</button>
</form>

<button on:click={logout}>Logout</button>