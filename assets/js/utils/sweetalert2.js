import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

export { Swal };

export function error(error){
    Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error,
    });
}

export function oopsError(){
    Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong. Please try again!",
    });
}

export function successPopUp(message, timer = 1500){
    Swal.fire({
        position: "top-end",
        title: `<div style="display: inline-flex; align-items: center; gap: 8px;">
            <div class="circle-tick"></div>
            <span>${message}</span>
        </div>`,
        showConfirmButton: false,
        timer: timer
    });
}

export function errorPopUp(message, timer = 1500){
    Swal.fire({
        position: "top-end",
        title: `<div style="display: inline-flex; align-items: center; gap: 8px;">
            <div class="circle-error"></div>
            <span>${message}</span>
        </div>`,
        showConfirmButton: false,
        timer: timer
    });
}