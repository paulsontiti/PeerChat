const form  = document.getElementById('join-form');

form.addEventListener('submit',(e)=>{
    e.preventDefault()
    const inviteCode = e.target.invite_link.value

    window.location = `index.html?room=${inviteCode}`
})