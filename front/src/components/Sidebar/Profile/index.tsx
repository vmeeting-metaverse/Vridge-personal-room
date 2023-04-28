import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router';
import jwt_decode from "jwt-decode";

import { logout } from '../../../apis/account';

import icons from '../../../images/icon';
import style from './Profile.module.scss';

import { useTranslation } from 'react-i18next'
import i18n from "i18next";

const Profile = (props: any) => {
    const { t }  = useTranslation();
    const navigate = useNavigate();

    const [jwt, setJwt] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        setJwt(localStorage.getItem('vm-jwt') || '');

        if (jwt){
            const decoded: any = jwt_decode(jwt);

            setName(decoded.context.user.name);
            setUsername(decoded.context.user.username);
            setEmail(decoded.context.user.email);
        }
    }, [jwt]);

    const onClickEditAvatar = async () => {
        //props.unityContext.unload();
        navigate('/avatar');
        window.location.reload();
    }

    const onClickPersonalRoom = async () => {
        navigate(`/spaces/${username}`);
        //window.location.reload();
    }

    const onClickLogout = async () => {
        localStorage.removeItem('vm-jwt');
        await logout();
        //props.unityContext.unload();
        navigate('/');
        window.location.reload();
    }

    return (
    <div className={style.container}>
        <div className={style.title}>
            {t('profile.title')}
            <img src={icons.closeImg} className={style.close_button} onClick={props.onClose} />
        </div>
        <div className={style.info} onClick={props.onClickEdit}>
            <div className={style.img}>
                <img src={icons.profileExImg} className={style.img_icon}></img>
            </div>
            <div className={style.text}>
                <div className={style.text_name}>
                    {name}
                </div>
                <div className={style.text_email}>
                    {email}
                </div>
            </div>
        </div>
        <div className={style.button_normal} onClick={onClickEditAvatar}>
        {t('profile.editAvatar')}
        </div>
        <div className={style.button_normal} onClick={onClickPersonalRoom}>
        {t('profile.personalRoom')}
        </div>
        <div className={style.button_warning} onClick={onClickLogout}>
        {t('profile.logout')}
        </div>
    </div>
    );
};


export default Profile;
